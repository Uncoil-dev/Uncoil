import runpy
import sys

import pytest


@pytest.fixture
def doctor_main(monkeypatch):
    """Replace the setup check with a stub that records its arguments."""
    calls = []
    result = {"code": 0}

    def fake_main(argv):
        calls.append(argv)
        return result["code"]

    monkeypatch.setattr("uncoil.doctor.main", fake_main)
    return calls, result


def run_module(monkeypatch, *args):
    monkeypatch.setattr(sys, "argv", ["uncoil", *args])
    with pytest.raises(SystemExit) as exited:
        runpy.run_module("uncoil", run_name="__main__")
    return exited.value.code


@pytest.mark.parametrize("args", [["doctor", "--no-send"], ["--no-send"]])
def test_both_entry_forms_run_the_setup_check(monkeypatch, doctor_main, args):
    calls, _ = doctor_main
    run_module(monkeypatch, *args)
    assert calls == [["--no-send"]]


@pytest.mark.parametrize("code", [0, 1, 2])
def test_exit_code_comes_from_the_setup_check(monkeypatch, doctor_main, code):
    _, result = doctor_main
    result["code"] = code
    assert run_module(monkeypatch, "doctor", "--no-send") == code
