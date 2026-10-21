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
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Login failed. Please try again.");
    }

    loginMessage.style.color = "green";
    loginMessage.textContent = "Login successful! Opening dashboard...";

    // Temporary destination until we build the dashboard page.
    window.location.href = "/admin/dashboard.html";
  } catch (error) {
    loginMessage.style.color = "#d93025";
    loginMessage.textContent =
      error.message || "Unable to connect to the server.";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Log In";
  }
});
