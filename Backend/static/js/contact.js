const contactForm = document.getElementById("contact-form");
const contactStatus = document.getElementById("contact-status");
const submitButton = contactForm.querySelector('button[type="submit"]');
const enquiryParams = new URLSearchParams(window.location.search);
const enquiryService = enquiryParams.get("service");
const enquiryMessage = enquiryParams.get("message");

if (enquiryService || enquiryMessage) {
  if (enquiryService && [...contactForm.elements.service.options].some((option) => option.value === enquiryService)) {
    contactForm.elements.service.value = enquiryService;
  }

  const briefFields = [
    ["Search goal", enquiryParams.get("propertyNeed")],
    ["Property type", enquiryParams.get("propertyType")],
    ["Preferred location", enquiryParams.get("propertyLocation")],
    ["Budget or price range", enquiryParams.get("propertyBudget")],
    ["Moving timeframe", enquiryParams.get("propertyTiming")],
    ["Additional details", enquiryParams.get("propertyRequirements")],
  ].filter(([, value]) => value && value.trim());
  const briefMessage = briefFields.map(([label, value]) => `${label}: ${value.trim()}`).join("\n");

  if (enquiryMessage || briefMessage) {
    contactForm.elements.message.value = [enquiryMessage, briefMessage].filter(Boolean).join("\n\n");
  }

  window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
}

contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (submitButton.disabled) return;

  const formData = new FormData(contactForm);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const subject = String(formData.get("service") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const backendURL = "/api/send-email";

  submitButton.disabled = true;
  contactStatus.hidden = false;
  contactStatus.textContent = "Sending...";
  contactStatus.dataset.status = "sending";

  try {
    const response = await fetch(backendURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message }),
    });

    if (!response.ok) {
      const result = response.headers.get("content-type")?.includes("application/json")
        ? await response.json()
        : {};
      throw new Error(result.error || "Failed to send email");
    }

    contactStatus.textContent = "Message sent — we'll get back to you within the next few hours.";
    contactStatus.dataset.status = "success";
    contactForm.reset();
  } catch (error) {
    console.error("Error sending message:", error);
    contactStatus.textContent = "Couldn't send your message. Please try again.";
    contactStatus.dataset.status = "error";
  } finally {
    submitButton.disabled = false;
  }
});