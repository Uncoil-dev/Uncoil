import pytest

from uncoil import doctor

KEY = "uncoil_sk_live_eu_abcdefghijklmnop"


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for name in ("UNCOIL_API_KEY", "UNCOIL_REGION", "UNCOIL_HOST", "UNCOIL_PROJECT_ID"):
        monkeypatch.delenv(name, raising=False)


class Calls(list):
    pass


@pytest.fixture
def calls(monkeypatch):
    made = Calls()

    def fake(ingest=200, reach="ok", whoami=None):
        monkeypatch.setattr(doctor, "_get_json", lambda url, timeout, headers: whoami if url.endswith("/api/sdk/whoami") else None)

        def request(method, url, timeout, headers=None, body=None):
            made.append((method, url, headers, body))
            if url.endswith("/api/ingest"):
                return ingest
            if reach == "down":
                raise OSError("Name or service not known")
            return 200
        monkeypatch.setattr(doctor, "_request", request)
    made.fake = fake
    return made


def status(result, check_id):
    return next((c["status"] for c in result["checks"] if c["id"] == check_id), None)


def test_passes_and_sends_one_tagged_trace(calls):
    calls.fake()
    result = doctor.run_doctor(api_key=KEY)
    assert result["ok"] and result["runId"].startswith("doctor_")
    posts = [c for c in calls if c[0] == "POST"]
    assert len(posts) == 1
    assert posts[0][2]["Authorization"] == f"Bearer {KEY}"
    assert posts[0][3]["tags"] == ["uncoil-doctor"] and posts[0][3]["spanType"] == "llm_call"
    assert "All good" in doctor.format_report(result)


def test_reads_key_from_environment(calls, monkeypatch):
    calls.fake()
    monkeypatch.setenv("UNCOIL_API_KEY", KEY)
    assert doctor.run_doctor()["ok"]


def test_missing_or_odd_key_makes_no_request(calls):
    calls.fake()
    assert status(doctor.run_doctor(), "key") == "fail"
    odd = doctor.run_doctor(api_key="sk-openai-1234567890123")
    assert "API keys page" in odd["checks"][-1]["hint"]
    assert not calls


def test_missing_key_points_at_unloaded_env_file(calls, monkeypatch, tmp_path):
    calls.fake()
    monkeypatch.chdir(tmp_path)
    assert ".env" not in doctor.run_doctor()["checks"][-1]["hint"]
    (tmp_path / ".env.local").write_text(f"OTHER=1\nexport UNCOIL_API_KEY={KEY}\n")
    report = doctor.format_report(doctor.run_doctor())
    assert ".env.local" in report and "python-dotenv" in report
    assert KEY not in report and "abcdefghijklmnop" not in report


def test_region_mismatch_is_caught(calls):
    calls.fake()
    assert status(doctor.run_doctor(api_key=KEY, region="us"), "region") == "fail"
    assert not calls


def test_unreachable_host_skips_trace(calls):
    calls.fake(reach="down")
    result = doctor.run_doctor(api_key=KEY)
    assert status(result, "network") == "fail" and status(result, "trace") is None


@pytest.mark.parametrize("code,word", [(401, "revoked"), (403, "disabled"), (429, "limit"), (503, "status page"), (422, "latest version")])
def test_http_errors_are_explained(calls, code, word):
    calls.fake(ingest=code)
    result = doctor.run_doctor(api_key=KEY)
    assert not result["ok"]
    assert word in result["checks"][-1]["hint"]


def test_no_send(calls):
    calls.fake()
    result = doctor.run_doctor(api_key=KEY, send=False)
    assert status(result, "trace") == "skip" and not [c for c in calls if c[0] == "POST"]


def test_key_is_never_printed_in_full(calls):
    calls.fake()
    assert KEY not in doctor.format_report(doctor.run_doctor(api_key=KEY))


def test_cli_exit_codes(calls, capsys):
    calls.fake()
    assert doctor.main(["--key", KEY, "--json"]) == 0
    assert doctor.main([]) == 1


def test_uncoil_command_runs_doctor_without_a_key(calls, capsys):
    from uncoil.__main__ import main

    assert main(["doctor", "--no-send"]) == 1
    assert "UNCOIL_API_KEY" in capsys.readouterr().out


def test_names_the_project_the_key_sends_to(calls):
    calls.fake(whoami={"projectId": "p1", "projectName": "Support bot"})
    result = doctor.run_doctor(api_key=KEY)
    assert status(result, "project") == "ok"
    assert "Traces will land in: Support bot" in doctor.format_report(result)


def test_fails_when_the_project_id_points_elsewhere(calls, monkeypatch):
    calls.fake(whoami={"projectId": "p1", "projectName": "Support bot"})
    monkeypatch.setenv("UNCOIL_PROJECT_ID", "p2")
    result = doctor.run_doctor(api_key=KEY)
    assert status(result, "project") == "fail" and not [c for c in calls if c[0] == "POST"]
