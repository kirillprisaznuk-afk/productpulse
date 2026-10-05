import json

import pytest

from app.seed.__main__ import main


def test_dry_run_needs_no_database(monkeypatch, capsys):
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://invalid:invalid@invalid/invalid")
    monkeypatch.setattr("sys.argv", ["seed", "--dry-run", "--seed", "7", "--users", "20"])
    main()
    report = json.loads(capsys.readouterr().out)
    assert report["counts"]["users"] == 20
    assert report["counts"]["experiments"] == 2
    assert sum(report["users_by_channel"].values()) == 20


def test_cli_refuses_existing_data(monkeypatch, capsys):
    class Engine:
        disposed = False

        def dispose(self):
            self.disposed = True

    engine = Engine()

    def refuse(engine, data, *, reset, if_empty):
        assert reset is False
        assert if_empty is False
        raise ValueError("Warehouse is not empty; use --reset")

    monkeypatch.setattr("sys.argv", ["seed", "--users", "20"])
    monkeypatch.setattr("app.seed.__main__.get_engine", lambda: engine)
    monkeypatch.setattr("app.seed.__main__.load", refuse)
    with pytest.raises(SystemExit) as exc:
        main()
    assert exc.value.code == 1
    assert "--reset" in capsys.readouterr().err
    assert engine.disposed
