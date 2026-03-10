/**
 * MedicChain Logistics – single credential set for both portals.
 * Username: Glitchcon
 * Password: VIT
 * Any other input shows: "It is wrong."
 */
(function () {
  "use strict";

  var USERNAME = "Glitchcon";
  var PASSWORD = "VIT";
  var WRONG_MSG = "It is wrong.";

  function setError(el, msg) {
    if (el) el.textContent = msg || "";
  }

  function validate(u, p) {
    // Exact match (case-sensitive) as requested
    return u === USERNAME && p === PASSWORD;
  }

  function login(role, usernameInput, passwordInput, errorEl) {
    setError(errorEl, "");
    var u = (usernameInput.value || "").trim();
    var p = passwordInput.value || ""; // password: don't trim so spaces count if any

    if (!u || !p) {
      setError(errorEl, WRONG_MSG);
      return;
    }

    if (!validate(u, p)) {
      setError(errorEl, WRONG_MSG);
      return;
    }

    sessionStorage.setItem("mc_logged_in", "1");
    sessionStorage.setItem("mc_login_role", role);
    sessionStorage.setItem("mc_login_username", u);
    window.location.href = "./index.html";
  }

  document.getElementById("formHospital").addEventListener("submit", function (e) {
    e.preventDefault();
    login(
      "hospital",
      document.getElementById("hospitalUsername"),
      document.getElementById("hospitalPassword"),
      document.getElementById("hospitalError")
    );
  });

  document.getElementById("formSupplier").addEventListener("submit", function (e) {
    e.preventDefault();
    login(
      "transport_provider",
      document.getElementById("supplierUsername"),
      document.getElementById("supplierPassword"),
      document.getElementById("supplierError")
    );
  });
})();
