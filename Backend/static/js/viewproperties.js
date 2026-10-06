const propertyBriefForm = document.querySelector(".property-brief-form");
const propertyBriefStatus = document.getElementById("property-brief-status");
const propertyBriefSubmitButton = propertyBriefForm?.querySelector('button[type="submit"]');

if (propertyBriefForm && propertyBriefStatus && propertyBriefSubmitButton) {
  propertyBriefForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!propertyBriefForm.reportValidity()) return;

    const formData = new FormData(propertyBriefForm);
    const payload = {
      looking_to: String(formData.get("propertyNeed") || "").trim(),
      property_type: String(formData.get("propertyType") || "").trim(),
      location: String(formData.get("propertyLocation") || "").trim(),
      price_range: String(formData.get("propertyBudget") || "").trim(),
      hoping_to: String(formData.get("propertyTiming") || "").trim(),
      message: String(formData.get("propertyRequirements") || "").trim(),
    };

    propertyBriefSubmitButton.disabled = true;
    propertyBriefStatus.hidden = false;
    propertyBriefStatus.textContent = "Sending your property brief...";
    propertyBriefStatus.dataset.status = "sending";

    try {
      const response = await fetch(propertyBriefForm.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = response.headers.get("content-type")?.includes("application/json")
          ? await response.json()
          : {};
        throw new Error(result.error || "Failed to send property enquiry");
      }

      propertyBriefStatus.textContent = "Your property brief has been sent to our team.";
      propertyBriefStatus.dataset.status = "success";
      propertyBriefForm.reset();
    } catch (error) {
      console.error("Error sending property enquiry:", error);
      propertyBriefStatus.textContent = "Couldn't send your property brief. Please try again.";
      propertyBriefStatus.dataset.status = "error";
    } finally {
      propertyBriefSubmitButton.disabled = false;
    }
  });
}