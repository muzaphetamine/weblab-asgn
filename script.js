const book = document.getElementById("book");
const frontCover = document.getElementById("frontCover");
const closeBtn = document.getElementById("closeBook");
const backCover = book.querySelector(".back-cover");
const pageDivs = Array.from(book.querySelectorAll(".page"));

const Z_STEP = 2;
const COVER_TIME = 1300;
const STAGGER = 150;

function getTurnTime() {
    const raw = getComputedStyle(book).getPropertyValue("--turn-time").trim();
    if (raw.endsWith("ms")) return parseFloat(raw);
    if (raw.endsWith("s")) return parseFloat(raw) * 1000;
    return 900; // fallback
}
const TURN_TIME = getTurnTime();
let sheets = [];
let totalSheets = 0;
let currentPage = 0;
let isOpen = false;
let isBusy = false;

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
        sheet.appendChild(createFace("sheet-front", imgs[0], i * 2 + 1));
        sheet.appendChild(createFace("sheet-back", imgs[1], i * 2 + 2));
        book.insertBefore(sheet, pageDiv);
        pageDiv.remove();
        sheets.push(sheet);
    });
    totalSheets = sheets.length;
}

function zUnflipped(i) { return (totalSheets - i) * Z_STEP; }
function zFlipped(i) { return (i + 1) * Z_STEP; }
function setSheetZ(i, z) { sheets[i].style.setProperty("--z", z + "px"); }
function setCoverZ(z) { frontCover.style.setProperty("--z", z + "px"); }
function initStacking() {
    sheets.forEach((_, i) => setSheetZ(i, zUnflipped(i)));
    setCoverZ((totalSheets + 2) * Z_STEP);   // cover sits on top when closed
}

function turnForward() {
    if (currentPage >= totalSheets) return;
    const i = currentPage;
    const sheet = sheets[i];
    sheet.classList.add("flipped", "turning");
    setTimeout(() => setSheetZ(i, zFlipped(i)), TURN_TIME / 2);
    setTimeout(() => sheet.classList.remove("turning"), TURN_TIME);
    currentPage++;
}

function turnBackward() {
    if (currentPage <= 0) return;
    const i = currentPage - 1;
    const sheet = sheets[i];
    sheet.classList.remove("flipped");
    sheet.classList.add("turning");
    setTimeout(() => setSheetZ(i, zUnflipped(i)), TURN_TIME / 2);
    setTimeout(() => sheet.classList.remove("turning"), TURN_TIME);
    currentPage--;
}

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

function openBook() {
    if (isOpen || isBusy) return;
    isBusy = true;
    isOpen = true;
    book.classList.add("open");
    closeBtn.classList.add("visible");
    setTimeout(() => setCoverZ(0), COVER_TIME / 2);
    setTimeout(() => (isBusy = false), COVER_TIME);
}

function closeBook() {
    if (!isOpen || isBusy) return;
    isBusy = true;
    closeBtn.classList.remove("visible");
    const pagesToReturn = currentPage;
    for (let k = 0; k < pagesToReturn; k++) {
        setTimeout(turnBackward, k * STAGGER);
    }
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

book.addEventListener("click", (e) => {
    if (!isOpen) {
        if (e.target.closest("#frontCover")) openBook();
        return;
    }
    const rect = book.getBoundingClientRect();
    const clickedLeftHalf = e.clientX < rect.left + rect.width / 2;
    clickedLeftHalf ? prevPage() : nextPage();
});


closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeBook();
});


document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
        isOpen ? nextPage() : openBook();
    } else if (e.key === "ArrowLeft") {
        prevPage();
    } else if (e.key === "Escape") {
        closeBook();
    }
});


buildSheets();
initStacking();