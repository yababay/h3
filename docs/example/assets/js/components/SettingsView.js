import h3 from "../h3.js";

export default function () {
  const toggleLogging = (e) => {
    const value = e.target.checked;
    h3.dispatch("settings/set", { logging: value });
    h3.dispatch("app/save");
  };
  return h3("div.settings.container", [
    h3("h1", "Settings"),
    h3("div.options", [
      h3("input", {
        type: "checkbox",
        onclick: toggleLogging,
        checked: h3.state.settings.logging,
      }),
      h3(
        "label#options-logging-label",
        {
          for: "logging",
        },
        "Logging"
      ),
    ]),
    h3(
      "a.nav-link",
      {
        onclick: () => h3.navigateTo("/"),
      },
      "← Go Back"
    ),
  ]);
}
