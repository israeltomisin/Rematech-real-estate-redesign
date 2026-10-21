const FALLBACK_PROPERTY_IMAGE =
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80";

// LOAD SELECTED PROPERTY DETAILS

async function loadSelectedProperty() {
    const params = new URLSearchParams(window.location.search);
    const propertyId = params.get("id");

    // Keep the normal property-search page when no ID is provided.
    if (!propertyId) return;

    const section = document.getElementById("selectedProperty");
    const loading = document.getElementById("propertyLoading");
    const content = document.getElementById("propertyDetailsContent");

    if (!section || !loading || !content) {
        console.error("Property details section is missing from viewproperties.html.");
        return;
    }

    section.hidden = false;
    loading.hidden = false;
    content.hidden = true;
    loading.textContent = "Loading property details...";

    try {
        const response = await fetch(
            `${VIEWPROPERTY_API_BASE}/api/properties`
        );

        if (!response.ok) {
            throw new Error(`Could not fetch properties: ${response.status}`);
        }

        const data = await response.json();
        const properties = Array.isArray(data) ? data : data.properties;

        if (!Array.isArray(properties)) {
            throw new Error("The API response does not contain a properties array.");
        }

        const property = properties.find(
            item => String(item.id) === String(propertyId)
        );

        if (!property) {
            loading.textContent =
                "Property not found. Please return to the properties page.";
            return;
        }

        console.log("Selected property:", property);

        const title = property.title || "Property listing";
        const location = property.location || "Location on request";
        const type = property.property_type || "Property";
        const status = property.status || "Status unavailable";

        // Display property image safely.
        let imageUrl = property.image_url || "";

        try {
            const parsedUrl = new URL(imageUrl, window.location.href);

            if (["http:", "https:"].includes(parsedUrl.protocol)) {
                imageUrl = parsedUrl.href;
            } else {
                imageUrl = "";
            }
        } catch {
            imageUrl = "";
        }

        if (!imageUrl) {
            imageUrl = FALLBACK_PROPERTY_IMAGE;
        }

        const image = document.getElementById("detailImage");

        if (image) {
            image.src = imageUrl;
            image.alt = title;

            image.onerror = () => {
                image.onerror = null;
                image.src = FALLBACK_PROPERTY_IMAGE;
            };
        }

        // Display property information.
        document.getElementById("detailTitle").textContent = title;
        document.getElementById("detailLocation").textContent = location;
        document.getElementById("detailType").textContent = type;
        document.getElementById("detailId").textContent = property.id;
        document.getElementById("detailStatus").textContent = status;

        const priceElement = document.getElementById("detailPrice");

        if (typeof formatPropertyPrice === "function") {
            priceElement.textContent = formatPropertyPrice(property.price);
        } else {
            priceElement.textContent = new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
                maximumFractionDigits: 2
            }).format(Number(property.price) || 0);
        }

        // Prefill the enquiry form.
        const typeSelect = document.getElementById("property-type");
        const locationInput = document.getElementById("property-location");
        const requirements = document.getElementById("property-requirements");

        if (typeSelect) {
            const matchingOption = [...typeSelect.options].find(option =>
                option.textContent.trim().toLowerCase() === type.toLowerCase()
            );

            if (matchingOption) {
                typeSelect.value = matchingOption.value;
            }
        }

        if (locationInput) {
            locationInput.value = location;
        }

        if (requirements) {
            requirements.value =
                `I'm enquiring about property ID ${property.id}: ${title}.`;
        }

        // Show the completed property details.
        loading.hidden = true;
        content.hidden = false;

    } catch (error) {
        console.error("Unable to load property details:", error);

        loading.textContent =
            "Unable to load this property. Please check your connection and try again.";
    }
}

loadSelectedProperty();

// SUBMIT PROPERTY ENQUIRY

const propertyBriefForm = document.querySelector(".property-brief-form");
const propertyBriefStatus = document.getElementById("property-brief-status");

const propertyBriefSubmitButton =
    propertyBriefForm?.querySelector('button[type="submit"]');

if (propertyBriefForm && propertyBriefStatus && propertyBriefSubmitButton) {
    propertyBriefForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (!propertyBriefForm.reportValidity()) return;

        const formData = new FormData(propertyBriefForm);

        const payload = {
            looking_to: String(formData.get("propertyNeed") || "").trim(),
            property_type: String(formData.get("propertyType") || "").trim(),
            location: String(formData.get("propertyLocation") || "").trim(),
            price_range: String(formData.get("propertyBudget") || "").trim(),
            hoping_to: String(formData.get("propertyTiming") || "").trim(),
            message: String(formData.get("propertyRequirements") || "").trim()
        };

        propertyBriefSubmitButton.disabled = true;
        propertyBriefStatus.hidden = false;
        propertyBriefStatus.textContent = "Sending your property brief...";
        propertyBriefStatus.dataset.status = "sending";

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
            // Send the request directly to the Express backend.
            const response = await fetch(
                `${VIEWPROPERTY_API_BASE}/api/property-enquiry`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                }
            );

            const result = await response.json().catch(() => ({}));

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.error || "Failed to send property enquiry."
                );
            }

            propertyBriefStatus.textContent =
                "Your property brief has been sent to our team.";

            propertyBriefStatus.dataset.status = "success";
            propertyBriefForm.reset();

        } catch (error) {
            console.error("Error sending property enquiry:", error);

            propertyBriefStatus.textContent = controller.signal.aborted
                ? "The request timed out. Please try again."
                : "Couldn't send your property brief. Please try again.";

            propertyBriefStatus.dataset.status = "error";

        } finally {
            clearTimeout(timeout);
            propertyBriefSubmitButton.disabled = false;
        }
    });
}
