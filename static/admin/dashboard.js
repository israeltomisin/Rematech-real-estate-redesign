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

// ADMIN SESSION

async function checkAdminSession() {
  try {
    const response = await fetch(`${REMATECH_API_BASE}/api/admin/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      window.location.replace("/admin/admin.html");
      return false;
    }

    const result = await response.json();

    dashboardMessage.textContent =
      `Logged in as ${result.admin.username}. Your admin session is active.`;

    return true;
  } catch {
    dashboardMessage.textContent =
      "Unable to verify your session. Please refresh the page.";
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
    propertyForm.elements.title.value = property.title || "";
    propertyForm.elements.property_type.value =
      property.property_type || "";
    propertyForm.elements.location.value = property.location || "";
    propertyForm.elements.price.value = property.price ?? "";
    propertyForm.elements.image_url.value = property.image_url || "";
    propertyForm.elements.description.value =
      property.description || "";
    propertyForm.elements.status.value =
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

// CREATE PROPERTY DETAIL ROW

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
    const response = await fetch("/api/properties", {
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("Could not load properties.");
    }

    const result = await response.json();
    const properties = result.properties || [];

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

      // Property image or placeholder
      const imageArea = document.createElement("div");
      imageArea.className = "property-image-area";

      if (property.image_url) {
        const image = document.createElement("img");

        image.className = "property-image";
        image.alt = property.title || "Property image";
        image.loading = "lazy";
        imageArea.appendChild(image);

        image.addEventListener("error", () => {
          image.remove();
          imageArea.classList.add("property-image-placeholder");
          imageArea.textContent = "⌂  REMATECH PROPERTIES";
        });

        image.src = property.image_url;
      } else {
        imageArea.classList.add("property-image-placeholder");
        imageArea.textContent = "⌂  REMATECH PROPERTIES";
      }

      card.appendChild(imageArea);

      // Property details
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

      const formattedPrice = Number.isFinite(numericPrice)
        ? `₦${numericPrice.toLocaleString("en-NG", {
            maximumFractionDigits: 2,
          })}`
        : "Not specified";

      details.appendChild(
        createPropertyInfo("Price", formattedPrice, "property-price")
      );

      // Status badge
      const statusValue = String(
        property.status || "available"
      ).toLowerCase();

      const statusBadge = document.createElement("span");
      statusBadge.className = "property-status";
      statusBadge.textContent = statusValue;

      if (["sold", "rented", "unavailable"].includes(statusValue)) {
        statusBadge.classList.add(`status-${statusValue}`);
      }

      const statusRow = document.createElement("div");
      statusRow.className = "property-info";

      const statusLabel = document.createElement("span");
      statusLabel.className = "property-label";
      statusLabel.textContent = "Status";

      statusRow.append(statusLabel, statusBadge);
      details.appendChild(statusRow);

      card.appendChild(details);

      // Action buttons
      const actions = document.createElement("div");
      actions.className = "property-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "edit-property";
      editButton.textContent = "✎  Edit";

      editButton.addEventListener("click", () => {
        showPropertyForm(property);
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-property";
      deleteButton.textContent = "▤  Delete";

      deleteButton.addEventListener("click", () => {
        deleteProperty(property);
      });

      actions.append(editButton, deleteButton);
      card.appendChild(actions);

      propertiesList.appendChild(card);
    }
  } catch {
    propertiesMessage.textContent =
      "Unable to load properties. Please try again.";
  }
}

// DELETE PROPERTY

async function deleteProperty(property) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${property.title}"? This cannot be undone.`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(
      `/api/admin/properties/${encodeURIComponent(property.id)}`,
      {
        method: "DELETE",
        credentials: "same-origin",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Could not delete property."
      );
    }

    await loadProperties();

    propertiesMessage.textContent =
      result.message || "Property deleted successfully.";
  } catch (error) {
    propertiesMessage.textContent =
      error.message || "Unable to delete property. Please try again.";
  }
}

// SAVE NEW OR UPDATED PROPERTY

propertyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!propertyForm.reportValidity()) return;

  const formData = new FormData(propertyForm);

  const propertyData = {
    title: formData.get("title").trim(),
    property_type: formData.get("property_type").trim(),
    location: formData.get("location").trim(),
    price: formData.get("price"),
    image_url: formData.get("image_url").trim(),
    description: formData.get("description").trim(),
    status: formData.get("status"),
  };

  const isEditing = editingPropertyId !== null;

  savePropertyButton.disabled = true;
  propertyFormMessage.textContent = "Saving property...";

  try {
    const response = await fetch(
      isEditing
        ? `/api/admin/properties/${encodeURIComponent(editingPropertyId)}`
        : "/api/admin/properties",
      {
        method: isEditing ? "PUT" : "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(propertyData),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Could not save property."
      );
    }

    hidePropertyForm();
    await loadProperties();

    propertiesMessage.textContent =
      result.message ||
      (isEditing
        ? "Property updated successfully."
        : "Property added successfully.");
  } catch (error) {
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
    const response = await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("Logout failed.");
    }

    window.location.replace("/admin/admin.html");
  } catch {
    dashboardMessage.textContent =
      "Could not log out. Please try again.";

    logoutButton.disabled = false;
  }
});

// Start by checking the admin session
checkAdminSession();
