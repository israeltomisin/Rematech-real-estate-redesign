
const REMATECH_API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "https://rematech-real-estate-redesign-2.onrender.com";

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";
  loginMessage.textContent = "";

  try {
    const response = await fetch(
      `${REMATECH_API_BASE}/api/admin/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Login failed. Please check your details."
      );
    }

    loginMessage.style.color = "green";
    loginMessage.textContent = "Login successful! Opening dashboard...";

    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Admin login error:", error);

    loginMessage.style.color = "#d93025";
    loginMessage.textContent =
      error.message || "Unable to connect to the server.";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Log In";
  }
});
