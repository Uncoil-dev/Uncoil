import pytest

from uncoil import doctor

KEY = "uncoil_sk_live_eu_abcdefghijklmnop"


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for name in ("UNCOIL_API_KEY", "UNCOIL_REGION", "UNCOIL_HOST"):
        monkeypatch.delenv(name, raising=False)


class Calls(list):
    pass


@pytest.fixture
def calls(monkeypatch):
    made = Calls()

    def fake(ingest=200, reach="ok", whoami=None):
        def get_json(url, timeout, headers=None):
            made.append(("GET", url, headers, None))
            return whoami

        def request(method, url, timeout, headers=None, body=None):
            made.append((method, url, headers, body))
            if url.endswith("/api/ingest"):
                return ingest
            if reach == "down":
                raise OSError("Name or service not known")
            return 200
        monkeypatch.setattr(doctor, "_request", request)
        monkeypatch.setattr(doctor, "_get_json", get_json)
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


def test_reports_the_project_traces_land_in(calls):
    calls.fake(whoami={"projectId": "proj_1", "projectName": "My agent"})
    result = doctor.run_doctor(api_key=KEY)
    project = next(c for c in result["checks"] if c["id"] == "project")
    assert project["status"] == "ok" and project["message"] == "Traces will land in: My agent"
    whoami = next(c for c in calls if c[1].endswith("/api/sdk/whoami"))
    assert whoami[2]["Authorization"] == f"Bearer {KEY}"


def test_skips_the_project_check_when_the_server_does_not_say(calls):
    calls.fake()
    result = doctor.run_doctor(api_key=KEY)
    assert status(result, "project") is None and result["ok"]


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


def test_key_in_env_file_is_used_without_printing_it(calls, monkeypatch, tmp_path):
    calls.fake()
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("UNCOIL_API_KEY", "")
    (tmp_path / ".env.local").write_text(f"OTHER=1\nexport UNCOIL_API_KEY={KEY}\n")
    report = doctor.format_report(doctor.run_doctor())
    assert "No API key" not in report
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
