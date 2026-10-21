const VIEWPROPERTY_API_BASE = "http://localhost:8000";
const menuButton = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const closeButton = document.getElementById('closeBtn');

if (menuButton && mobileMenu && closeButton) {
    const closeMenu = () => {
        mobileMenu.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        menuButton.focus();
    };

    menuButton.addEventListener('click', () => {
        mobileMenu.classList.add('is-open');
        menuButton.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        closeButton.focus();
    });

    closeButton.addEventListener('click', closeMenu);

    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', event => {
        if (
            event.key === 'Escape' &&
            mobileMenu.classList.contains('is-open')
        ) {
            closeMenu();
        }
    });
}

/* SHARED REMATECH API CONFIGURATION */

// Local testing
const REMATECH_API_BASE = "http://localhost:8000";

// For deployment, replace the URL above with your deployed backend origin.
// Example: https://your-backend.onrender.com
// Do not add /api/properties to the base URL.


/* SHARED PROPERTY HELPERS */

function formatPropertyPrice(value) {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return "Price on request";
    }

    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "Price on request";
    }

    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
    }).format(amount);
}

function escapePropertyHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function getSafePropertyImage(value) {
    const fallback =
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80";

    if (typeof value !== "string" || !value.trim()) {
        return fallback;
    }

    try {
        const url = new URL(value, window.location.href);

        return ["http:", "https:"].includes(url.protocol)
            ? url.href
            : fallback;
    } catch {
        return fallback;
    }
}


async function fetchPropertyList() {
    const response = await fetch(
        `${REMATECH_API_BASE}/api/properties`,
        {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        }
    );

    if (!response.ok) {
        throw new Error(
            `Properties API request failed (${response.status})`
        );
    }

    const result = await response.json();

    const properties = Array.isArray(result)
        ? result
        : result?.properties;

    if (!Array.isArray(properties)) {
        throw new Error(
            "Unexpected API response: expected a properties array."
        );
    }

    return properties;
}



/* HOMEPAGE PROPERTY LISTINGS */

async function loadLatestProperties() {
    const grid = document.getElementById("latestPropertiesGrid");
    const statusMessage =
        document.getElementById("propertiesStatus");

    // Skip this function on pages without the homepage grid.
    if (!grid || !statusMessage) return;

    try {
        const properties = await fetchPropertyList();

        const available = properties.filter(property =>
            String(property.status || "available").toLowerCase() ===
            "available"
        );

        if (!available.length) {
            statusMessage.textContent =
                "No available properties at the moment. Please check back soon.";

            grid.innerHTML = `
                <div class="latest-properties-empty">
                    New property listings will appear here when available.
                </div>
            `;

            return;
        }

        statusMessage.textContent = "";

        grid.innerHTML = available.slice(0, 6).map(property => {
            const title = escapePropertyHTML(
                property.title || "Property listing"
            );

            const type = escapePropertyHTML(
                property.property_type || "Property"
            );

            const location = escapePropertyHTML(
                property.location || "Location available on enquiry"
            );

            const image = escapePropertyHTML(
                getSafePropertyImage(property.image_url)
            );

            return `
                <article class="latest-property-card">
                    <div class="latest-property-image-wrap">
                        <img
                            class="latest-property-image"
                            src="${image}"
                            alt="${title}"
                            loading="lazy"
                            onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80';"
                        >

                        <span class="property-status-badge">
                            Available
                        </span>
                    </div>

                    <div class="latest-property-content">
                        <p class="latest-property-type">${type}</p>

                        <h3 class="latest-property-title">
                            ${title}
                        </h3>

                        <p class="latest-property-location">
                            <i
                                class="fa-solid fa-location-dot"
                                aria-hidden="true"
                            ></i>
                            ${location}
                        </p>

                        <div class="latest-property-bottom">
                            <p class="latest-property-price">
                                ${formatPropertyPrice(property.price)}
                            </p>

                            <a
                                class="latest-property-link"
                                href="./viewproperties.html"
                            >
                                Enquire
                                <i
                                    class="fa-solid fa-arrow-right"
                                    aria-hidden="true"
                                ></i>
                            </a>
                        </div>
                    </div>
                </article>
            `;
        }).join("");

    } catch (error) {
        console.error(
            "Failed to load homepage properties:",
            error
        );

        statusMessage.textContent =
            "We couldn't load properties right now.";

        grid.innerHTML = `
            <div class="latest-properties-empty">
                Please try again shortly or visit our
                <a href="./properties.html">properties page</a>.
            </div>
        `;
    }
}


/* DYNAMIC ALL PROPERTIES PAGE */

async function loadAllProperties() {
    const grid = document.getElementById("allPropertiesGrid");
    if (!grid) return;

    const search = document.getElementById("propertySearch");
    const typeFilter = document.getElementById("propertyTypeFilter");
    const stateFilter = document.getElementById("propertyStateFilter");
    const cityFilter = document.getElementById("propertyCityFilter");
    const sort = document.getElementById("propertySort");
    const count = document.getElementById("propertyCount");
    const message = document.getElementById("propertyResultsMessage");
    const empty = document.getElementById("propertyEmptyState");
    const clear = document.getElementById("clearPropertyFilters");
    const emptyClear = document.getElementById("emptyClearFilters");

    if (![search, typeFilter, stateFilter, cityFilter, sort,
        count, message, empty, clear, emptyClear].every(Boolean)) {
        console.error("Some property filter HTML elements are missing.");
        return;
    }

    let properties = [];

    const nigerianStates = [
        "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi",
        "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
        "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
        "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
        "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
        "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
        "Yobe", "Zamfara", "Federal Capital Territory (FCT)"
    ];

    function getLocation(location) {
        const raw = String(location || "").trim();
        const lower = raw.toLowerCase();

        if (!raw) {
            return { state: "Other", city: "Not specified" };
        }

        if (
            lower.includes("federal capital territory") ||
            lower === "fct" ||
            lower.includes("abuja")
        ) {
            return {
                state: "Federal Capital Territory (FCT)",
                city: raw.includes(",") ? raw.split(",")[0].trim() : "Abuja / FCT"
            };
        }

        const parts = raw.split(",").map(part => part.trim());
        const last = parts[parts.length - 1];

        const matchedState = nigerianStates.find(
            state => state.toLowerCase() === last.toLowerCase()
        );

        if (matchedState) {
            return {
                state: matchedState,
                city: parts.length > 1
                    ? parts.slice(0, -1).join(", ")
                    : matchedState
            };
        }

        const exactState = nigerianStates.find(
            state => state.toLowerCase() === lower
        );

        if (exactState) {
            return { state: exactState, city: exactState };
        }

        return { state: "Other", city: raw };
    }

    function fillSelect(select, values, label) {
        const previous = select.value;
        const uniqueValues = new Map();

        values
            .filter(value => value !== null && value !== undefined)
            .map(value => String(value).trim())
            .filter(Boolean)
            .forEach(value => {
                const key = value.toLowerCase();

                if (!uniqueValues.has(key)) {
                    uniqueValues.set(key, value);
                }
            });

        select.replaceChildren(new Option(label, ""));

        [...uniqueValues.values()]
            .sort((a, b) => a.localeCompare(b))
            .forEach(value => {
                select.add(new Option(value, value));
            });

        const matchingOption = [...select.options].find(
            option => option.value.toLowerCase() === previous.toLowerCase()
        );

        if (matchingOption) {
            select.value = matchingOption.value;
        }
    }

    function updateCities() {
        const selectedState = stateFilter.value;

        const matching = selectedState
            ? properties.filter(p => p._state === selectedState)
            : properties;

        fillSelect(
            cityFilter,
            matching.map(p => p._city),
            selectedState ? "All cities / areas" : "All locations"
        );
    }

    function render() {
        const term = search.value.trim().toLowerCase();
        const selectedType = typeFilter.value;
        const selectedState = stateFilter.value;
        const selectedCity = cityFilter.value;

        let results = properties.filter(property => {
            const searchable = [
                property.title,
                property.location,
                property.property_type,
                property.description,
                property._state,
                property._city
            ].join(" ").toLowerCase();

            return searchable.includes(term) &&
                (!selectedType ||
                    property.property_type === selectedType) &&
                (!selectedState ||
                    property._state === selectedState) &&
                (!selectedCity ||
                    property._city === selectedCity);
        });

        if (sort.value === "low-high" || sort.value === "high-low") {
            results.sort((a, b) => {
                const aPrice = Number(a.price);
                const bPrice = Number(b.price);

                const aValid = a.price !== null &&
                    a.price !== "" && Number.isFinite(aPrice);
                const bValid = b.price !== null &&
                    b.price !== "" && Number.isFinite(bPrice);

                if (!aValid && !bValid) return 0;
                if (!aValid) return 1;
                if (!bValid) return -1;

                return sort.value === "low-high"
                    ? aPrice - bPrice
                    : bPrice - aPrice;
            });
        }

        count.textContent = results.length;
        message.textContent =
            `Showing ${results.length} of ${properties.length} available properties`;

        grid.replaceChildren();
        empty.hidden = results.length > 0;

        results.forEach(property => {
            const card = document.createElement("article");
            card.className = "available-property-card";

            const imageWrap = document.createElement("div");
            imageWrap.className = "available-property-card__image-wrap";

            const image = document.createElement("img");
            image.className = "available-property-card__image";
            image.alt = property.title || "Property listing";
            image.loading = "lazy";
            image.src = getSafePropertyImage(property.image_url);
            image.onerror = () => {
            image.onerror = null;
            image.src =
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80";
            };

            const badge = document.createElement("span");
            badge.className = "available-property-card__badge";
            badge.textContent = "Available";
            imageWrap.append(image, badge);

            const body = document.createElement("div");
            body.className = "available-property-card__body";

            const type = document.createElement("p");
            type.className = "available-property-card__type";
            type.textContent = property.property_type || "Property";

            const title = document.createElement("h3");
            title.className = "available-property-card__title";
            title.textContent = property.title || "Property listing";

            const location = document.createElement("p");
            location.className = "available-property-card__location";

            const locationIcon = document.createElement("i");
            locationIcon.className = "fa-solid fa-location-dot";
            locationIcon.setAttribute("aria-hidden", "true");

            const locationText = document.createElement("span");
            locationText.textContent = property.location || "Location on enquiry";
            location.append(locationIcon, locationText);

            const footer = document.createElement("div");
            footer.className = "available-property-card__footer";

            const price = document.createElement("p");
            price.className = "available-property-card__price";
            price.textContent = formatPropertyPrice(property.price);

            const link = document.createElement("a");
            link.className = "available-property-card__link";
            link.href = `./viewproperties.html?id=${encodeURIComponent(property.id)}`;
            link.textContent = "View Details ";

            const arrow = document.createElement("i");
            arrow.className = "fa-solid fa-arrow-right";
            arrow.setAttribute("aria-hidden", "true");
            link.append(arrow);

            footer.append(price, link);
            body.append(type, title, location, footer);
            card.append(imageWrap, body);
            grid.append(card);
        });
    }

    function clearFilters() {
        search.value = "";
        typeFilter.value = "";
        stateFilter.value = "";
        updateCities();
        cityFilter.value = "";
        sort.value = "default";
        render();
    }

    search.addEventListener("input", render);
    typeFilter.addEventListener("change", render);

    stateFilter.addEventListener("change", () => {
        updateCities();
        render();
    });

    cityFilter.addEventListener("change", render);
    sort.addEventListener("change", render);
    clear.addEventListener("click", clearFilters);
    emptyClear.addEventListener("click", clearFilters);

    try {
        message.textContent = "Loading available properties...";
        count.textContent = "—";
        empty.hidden = true;

        const response = await fetch(
            `${REMATECH_API_BASE}/api/properties`
        );

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        const allProperties = Array.isArray(data)
            ? data
            : data.properties;

        if (!Array.isArray(allProperties)) {
            throw new Error("Invalid properties API response.");
        }

        properties = allProperties
            .filter(property =>
                String(property.status || "").toLowerCase() === "available"
            )
            .map(property => ({
                ...property,
                ...(() => {
                    const place = getLocation(property.location);
                    return {
                        _state: place.state,
                        _city: place.city
                    };
                })()
            }));

        // Property types
fillSelect(
    typeFilter,
    ["Apartment", "Land", "Duplex"],
    "All property types"
);

        // All Nigerian states, whether properties exist there or not
        stateFilter.replaceChildren(new Option("All states", ""));

        nigerianStates.forEach(state => {
            stateFilter.add(new Option(state, state));
        });

        // Reset the state selection on initial load
        stateFilter.value = "";
        cityFilter.replaceChildren(new Option("All locations", ""));

        updateCities();
        render();

        if (properties.length === 0) {
            message.textContent = "No available properties at the moment.";
        }

        if (!properties.length) {
            message.textContent = "No available properties at the moment.";
        }
    } catch (error) {
        console.error("Failed to load properties:", error);

        count.textContent = "0";
        message.textContent =
            "Unable to load properties. Please try again later.";

        grid.replaceChildren();
        empty.hidden = false;

        const heading = empty.querySelector("h3");
        const description = empty.querySelector("p");

        if (heading) heading.textContent = "Unable to load properties";
        if (description) {
            description.textContent =
                "Please refresh the page or check your internet connection.";
        }

        emptyClear.hidden = true;
    }
}


/* INITIALIZE PAGE-SPECIFIC PROPERTY LOADERS */

function initializeRematechPage() {
    loadLatestProperties();
    loadAllProperties();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeRematechPage,
        { once: true }
    );
} else {
    initializeRematechPage();
}
