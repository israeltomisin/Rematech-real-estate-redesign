
const REMATECH_API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "https://rematech-real-estate-redesign-2.onrender.com";

const dashboardMessage = document.getElementById("dashboardMessage");
const logoutButton = document.getElementById("logoutButton");
const viewPropertiesButton = document.getElementById("viewPropertiesButton");
const addPropertyButton = document.getElementById("addPropertyButton");
const propertiesSection = document.getElementById("propertiesSection");
const propertiesMessage = document.getElementById("propertiesMessage");
const propertiesList = document.getElementById("propertiesList");
const propertyFormSection = document.getElementById("propertyFormSection");
const propertyForm = document.getElementById("propertyForm");
const propertyFormTitle = document.getElementById("propertyFormTitle");
const propertyFormMessage = document.getElementById("propertyFormMessage");
const savePropertyButton = document.getElementById("savePropertyButton");
const cancelPropertyButton = document.getElementById("cancelPropertyButton");

let editingPropertyId = null;

// API HELPER

async function apiRequest(path, options = {}) {
  const response = await fetch(`${REMATECH_API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

// ADMIN SESSION

async function checkAdminSession() {
  try {
    const result = await apiRequest("/api/admin/me");

    if (!result.admin) {
      window.location.replace("admin.html");
      return false;
    }

    dashboardMessage.textContent =
      `Logged in as ${result.admin.username}. Your admin session is active.`;

    return true;
  } catch (error) {
    console.error("Session verification failed:", error);

    dashboardMessage.textContent =
      "Your session could not be verified. Please log in again.";

    window.location.replace("admin.html");
    return false;
  }
}

// ADD / EDIT PROPERTY FORM

function showPropertyForm(property = null) {
  editingPropertyId = property ? property.id : null;

  propertyForm.reset();

  propertyFormTitle.textContent = property
    ? "Edit Property"
    : "Add a Property";

  savePropertyButton.textContent = property
    ? "Update Property"
    : "Save Property";

  propertyFormMessage.textContent = "";

  if (property) {
    propertyForm.elements.namedItem("title").value =
      property.title || "";

    propertyForm.elements.namedItem("property_type").value =
      (property.property_type || "").toLowerCase();

    propertyForm.elements.namedItem("location").value =
      property.location || "";

    propertyForm.elements.namedItem("price").value =
      property.price ?? "";

    propertyForm.elements.namedItem("image_url").value =
      property.image_url || "";

    propertyForm.elements.namedItem("description").value =
      property.description || "";

    propertyForm.elements.namedItem("status").value =
      property.status || "available";
  }

  propertyFormSection.hidden = false;

  propertyFormSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function hidePropertyForm() {
  propertyFormSection.hidden = true;
  propertyForm.reset();
  propertyFormMessage.textContent = "";
  editingPropertyId = null;
}

// PROPERTY INFORMATION ROW

function createPropertyInfo(label, value, extraClass = "") {
  const row = document.createElement("div");
  row.className = "property-info";

  const labelElement = document.createElement("span");
  labelElement.className = "property-label";
  labelElement.textContent = label;

  const valueElement = document.createElement("span");
  valueElement.className = `property-value ${extraClass}`.trim();
  valueElement.textContent = value;

  row.append(labelElement, valueElement);

  return row;
}

// LOAD AND DISPLAY PROPERTIES

async function loadProperties() {
  propertiesSection.hidden = false;
  propertiesMessage.textContent = "Loading properties...";
  propertiesList.replaceChildren();

  try {
    const result = await apiRequest("/api/properties");
    const properties = Array.isArray(result)
      ? result
      : result.properties || [];

    if (properties.length === 0) {
      propertiesMessage.textContent =
        "No properties found yet. Add your first property to get started.";
      return;
    }

    propertiesMessage.textContent =
      `${properties.length} property/properties found.`;

    for (const property of properties) {
      const card = document.createElement("article");
      card.className = "property-card";

      // PROPERTY IMAGE

      const imageArea = document.createElement("div");
      imageArea.className = "property-image-area";

      if (property.image_url) {
        const image = document.createElement("img");

        image.className = "property-image";
        image.alt = property.title || "Property image";
        image.loading = "lazy";

        image.addEventListener("error", () => {
          image.remove();
          imageArea.classList.add("property-image-placeholder");
          imageArea.textContent = "⌂ REMATECH PROPERTIES";
        });

        image.src = property.image_url;
        imageArea.appendChild(image);
      } else {
        imageArea.classList.add("property-image-placeholder");
        imageArea.textContent = "⌂ REMATECH PROPERTIES";
      }

      card.appendChild(imageArea);

      // PROPERTY DETAILS

      const details = document.createElement("div");
      details.className = "property-details";

      const title = document.createElement("h3");
      title.textContent = property.title || "Untitled Property";
      details.appendChild(title);

      details.appendChild(
        createPropertyInfo(
          "Type",
          property.property_type || "Not specified"
        )
      );

      details.appendChild(
        createPropertyInfo(
          "Location",
          property.location || "Not specified"
        )
      );

      const numericPrice = Number(property.price);

      const formattedPrice =
        property.price !== null &&
        property.price !== undefined &&
        String(property.price).trim() !== "" &&
        Number.isFinite(numericPrice)
          ? `₦${numericPrice.toLocaleString("en-NG", {
              maximumFractionDigits: 2,
            })}`
          : "Price on request";

      details.appendChild(
        createPropertyInfo("Price", formattedPrice, "property-price")
      );

      // STATUS

      const statusValue = String(
        property.status || "available"
      ).toLowerCase();

      const statusRow = document.createElement("div");
      statusRow.className = "property-info";

      const statusLabel = document.createElement("span");
      statusLabel.className = "property-label";
      statusLabel.textContent = "Status";

      const statusBadge = document.createElement("span");
      statusBadge.className = "property-status";
      statusBadge.textContent = statusValue;

      if (
        ["sold", "rented", "unavailable"].includes(statusValue)
      ) {
        statusBadge.classList.add(`status-${statusValue}`);
      }

      statusRow.append(statusLabel, statusBadge);
      details.appendChild(statusRow);
      card.appendChild(details);

      // ACTION BUTTONS

      const actions = document.createElement("div");
      actions.className = "property-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "edit-property";
      editButton.textContent = "✎ Edit";

      editButton.addEventListener("click", () => {
        showPropertyForm(property);
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-property";
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener("click", () => {
        deleteProperty(property);
      });

      actions.append(editButton, deleteButton);
      card.appendChild(actions);

      propertiesList.appendChild(card);
    }
  } catch (error) {
    console.error("Loading properties failed:", error);

    propertiesMessage.textContent =
      error.message || "Unable to load properties. Please try again.";
  }
}

// DELETE PROPERTY

async function deleteProperty(property) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${property.title}"? This cannot be undone.`
  );

  if (!confirmed) return;

  try {
    const result = await apiRequest(
      `/api/admin/properties/${encodeURIComponent(property.id)}`,
      { method: "DELETE" }
    );

    await loadProperties();

    propertiesMessage.textContent =
      result.message || "Property deleted successfully.";
  } catch (error) {
    console.error("Deleting property failed:", error);

    propertiesMessage.textContent =
      error.message || "Unable to delete property.";
  }
}

// CREATE OR UPDATE PROPERTY

propertyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!propertyForm.reportValidity()) return;

  const formData = new FormData(propertyForm);

  const propertyData = {
    title: String(formData.get("title") || "").trim(),
    property_type: String(
      formData.get("property_type") || ""
    ).trim(),
    location: String(formData.get("location") || "").trim(),
    price: formData.get("price"),
    image_url: String(formData.get("image_url") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    status: formData.get("status") || "available",
  };

  const isEditing = editingPropertyId !== null;

  savePropertyButton.disabled = true;
  propertyFormMessage.textContent = "Saving property...";

  try {
    const path = isEditing
      ? `/api/admin/properties/${encodeURIComponent(editingPropertyId)}`
      : "/api/admin/properties";

    const result = await apiRequest(path, {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(propertyData),
    });

    hidePropertyForm();
    await loadProperties();

    propertiesMessage.textContent =
      result.message ||
      (isEditing
        ? "Property updated successfully."
        : "Property added successfully.");
  } catch (error) {
    console.error("Saving property failed:", error);

    propertyFormMessage.textContent =
      error.message || "Unable to save property. Please try again.";
  } finally {
    savePropertyButton.disabled = false;
  }
});

// BUTTON EVENTS

addPropertyButton.addEventListener("click", () => {
  showPropertyForm();
});

cancelPropertyButton.addEventListener("click", hidePropertyForm);

viewPropertiesButton.addEventListener("click", loadProperties);

// ADMIN LOGOUT

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    await apiRequest("/api/admin/logout", {
      method: "POST",
    });

    window.location.replace("admin.html");
  } catch (error) {
    console.error("Logout failed:", error);

    dashboardMessage.textContent =
      error.message || "Could not log out. Please try again.";

    logoutButton.disabled = false;
  }
});

// INITIALIZE DASHBOARD

async function initializeDashboard() {
  const authenticated = await checkAdminSession();

  if (!authenticated) return;

  // Load the property listings after session verification.
  await loadProperties();
}

initializeDashboard();
