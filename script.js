const book = document.getElementById("book");
const frontCover = document.getElementById("frontCover");
const closeBtn = document.getElementById("closeBook");
const backCover = book.querySelector(".back-cover");
const pageDivs = Array.from(book.querySelectorAll(".page"));

// ---------- 2. SETTINGS / STATE ----------
const Z_STEP = 2;                 // px gap between stacked sheets (prevents overlap flicker)
const COVER_TIME = 1300;          // ms - matches the cover transition in the CSS
const STAGGER = 150;              // ms delay between pages when closing the book

// Read --turn-time (e.g. ".9s") from the CSS so JS and CSS stay in sync
function getTurnTime() {
    const raw = getComputedStyle(book).getPropertyValue("--turn-time").trim();
    if (raw.endsWith("ms")) return parseFloat(raw);
    if (raw.endsWith("s")) return parseFloat(raw) * 1000;
    return 900; // fallback
}
const TURN_TIME = getTurnTime();

let sheets = [];                  // all sheet elements, in order
let totalSheets = 0;
let currentPage = 0;              // how many sheets are flipped to the left
let isOpen = false;
let isBusy = false;               // blocks clicks while an animation is running

// ---------- 3. BUILD SHEETS FROM THE .page DIVS ----------
// Creates one face (front or back) containing the image.
// If the image fails to load, a styled placeholder is shown instead.
function createFace(className, imgEl, pageNumber) {
    const face = document.createElement("div");
    face.className = "sheet-face " + className;

    const content = document.createElement("div");
    content.className = "page-content";

    if (imgEl) {
        imgEl.draggable = false;
        imgEl.addEventListener("error", () => {
            content.innerHTML = "";
            content.appendChild(createPlaceholder(pageNumber));
        });
        content.appendChild(imgEl);
    } else {
        content.appendChild(createPlaceholder(pageNumber));
    }

    face.appendChild(content);
    return face;
}

// Placeholder shown when an image is missing (uses the .page-placeholder CSS)
function createPlaceholder(pageNumber) {
    const ph = document.createElement("div");
    ph.className = "page-placeholder";
    ph.innerHTML =
        '<span class="number">' + pageNumber + "</span>" +
        '<span class="placeholder-title">IMAGE NOT FOUND</span>' +
        '<span class="placeholder-footer">MY IMAGE GALLERY</span>';
    return ph;
}

function buildSheets() {
    pageDivs.forEach((pageDiv, i) => {
        const imgs = pageDiv.querySelectorAll("img");

        const sheet = document.createElement("div");
        sheet.className = "sheet";

        // Front face = page number 2i+1, back face = page number 2i+2
        sheet.appendChild(createFace("sheet-front", imgs[0], i * 2 + 1));
        sheet.appendChild(createFace("sheet-back", imgs[1], i * 2 + 2));

        // Put the new sheet where the old .page div was, then remove the old one
        book.insertBefore(sheet, pageDiv);
        pageDiv.remove();
        sheets.push(sheet);
    });
    totalSheets = sheets.length;
}

// ---------- 4. STACKING ORDER (z-index in 3D) ----------
// Un-flipped sheets: first sheet is on top of the pile (highest z).
// Flipped sheets:    last flipped sheet is on top (highest z).
function zUnflipped(i) { return (totalSheets - i) * Z_STEP; }
function zFlipped(i) { return (i + 1) * Z_STEP; }

function setSheetZ(i, z) { sheets[i].style.setProperty("--z", z + "px"); }
function setCoverZ(z) { frontCover.style.setProperty("--z", z + "px"); }

function initStacking() {
    sheets.forEach((_, i) => setSheetZ(i, zUnflipped(i)));
    setCoverZ((totalSheets + 2) * Z_STEP);   // cover sits on top when closed
}

// ---------- 5. TURNING ONE PAGE ----------
function turnForward() {
    if (currentPage >= totalSheets) return;       // already at the end
    const i = currentPage;
    const sheet = sheets[i];

    sheet.classList.add("flipped", "turning");
    // Change z only at the halfway point, when the sheet is edge-on,
    // so the swap is invisible to the viewer.
    setTimeout(() => setSheetZ(i, zFlipped(i)), TURN_TIME / 2);
    setTimeout(() => sheet.classList.remove("turning"), TURN_TIME);

    currentPage++;
}

function turnBackward() {
    if (currentPage <= 0) return;                 // nothing to go back to
    const i = currentPage - 1;
    const sheet = sheets[i];

    sheet.classList.remove("flipped");
    sheet.classList.add("turning");
    setTimeout(() => setSheetZ(i, zUnflipped(i)), TURN_TIME / 2);
    setTimeout(() => sheet.classList.remove("turning"), TURN_TIME);

    currentPage--;
}

// Public versions with the "busy" lock so users can't spam-click
function nextPage() {
    if (!isOpen || isBusy || currentPage >= totalSheets) return;
    isBusy = true;
    turnForward();
    setTimeout(() => (isBusy = false), TURN_TIME);
}

function prevPage() {
    if (!isOpen || isBusy) return;
    if (currentPage === 0) {          // on the first spread -> go back to closed book
        closeBook();
        return;
    }
    isBusy = true;
    turnBackward();
    setTimeout(() => (isBusy = false), TURN_TIME);
}

// ---------- 6. OPEN / CLOSE THE BOOK ----------
function openBook() {
    if (isOpen || isBusy) return;
    isBusy = true;
    isOpen = true;

    book.classList.add("open");       // CSS flips the cover and centres the book
    closeBtn.classList.add("visible");

    // Drop the cover's z once it's edge-on so it ends up under the left pages
    setTimeout(() => setCoverZ(0), COVER_TIME / 2);
    setTimeout(() => (isBusy = false), COVER_TIME);
}

function closeBook() {
    if (!isOpen || isBusy) return;
    isBusy = true;
    closeBtn.classList.remove("visible");

    // Step 1: flip every turned page back, one after another
    const pagesToReturn = currentPage;
    for (let k = 0; k < pagesToReturn; k++) {
        setTimeout(turnBackward, k * STAGGER);
    }

    // Step 2: once the last page is back, close the cover
    const waitForPages = pagesToReturn > 0
        ? (pagesToReturn - 1) * STAGGER + TURN_TIME
        : 0;

    setTimeout(() => {
        book.classList.remove("open");
        isOpen = false;
        // Bring cover back on top once it's edge-on again
        setTimeout(() => setCoverZ((totalSheets + 2) * Z_STEP), COVER_TIME / 2);
        setTimeout(() => (isBusy = false), COVER_TIME);
    }, waitForPages);
}

// ---------- 7. EVENT LISTENERS ----------
// Clicks on the book
book.addEventListener("click", (e) => {
    // Closed book: only the front cover opens it
    if (!isOpen) {
        if (e.target.closest("#frontCover")) openBook();
        return;
    }

    // Open book: left half = previous, right half = next
    const rect = book.getBoundingClientRect();
    const clickedLeftHalf = e.clientX < rect.left + rect.width / 2;
    clickedLeftHalf ? prevPage() : nextPage();
});

// Close button
closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeBook();
});

// Keyboard controls
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
        isOpen ? nextPage() : openBook();
    } else if (e.key === "ArrowLeft") {
        prevPage();
    } else if (e.key === "Escape") {
        closeBook();
    }
});

// ---------- 8. START ----------
buildSheets();
initStacking();