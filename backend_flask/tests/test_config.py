import importlib


def test_openai_api_key_is_stripped(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "  sk-test-key  ")

    config_module = importlib.import_module("config.config")
    importlib.reload(config_module)

    assert config_module.Config.OPENAI_API_KEY == "sk-test-key"


def test_blank_openai_api_key_becomes_none(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "   ")

    config_module = importlib.import_module("config.config")
    importlib.reload(config_module)

    assert config_module.Config.OPENAI_API_KEY is None
