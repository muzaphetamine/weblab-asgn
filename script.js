const book = document.getElementById("book");
const cover = document.getElementById("frontCover");
const closeButton = document.getElementById("closeBook");

let isOpen = false;
let isAnimating = false;
let flippedCount = 0;

const sheets = [];


/* =========================================
   1. TIMING
========================================= */

function getDuration(variable, fallback) {
    const value = getComputedStyle(book)
        .getPropertyValue(variable)
        .trim();

    if (value.endsWith("ms")) return parseFloat(value);
    if (value.endsWith("s")) return parseFloat(value) * 1000;

    return fallback;
}

const TURN_MS = getDuration("--turn-time", 900);
const COVER_MS = getDuration("--cover-time", 1300);


/* =========================================
   2. CREATE PAGE CONTENT
========================================= */

function createPageContent(src, pageNumber) {
    const content = document.createElement("div");
    content.className = "page-content";

    const placeholder = document.createElement("div");
    placeholder.className = "page-placeholder";

    const number = document.createElement("span");
    number.className = "number";
    number.textContent = String(pageNumber).padStart(2, "0");

    const title = document.createElement("span");
    title.className = "placeholder-title";
    title.textContent = "YOUR MEMORIES";

    const footer = document.createElement("span");
    footer.className = "placeholder-footer";
    footer.textContent = "MY IMAGE GALLERY";

    placeholder.append(number, title, footer);
    content.appendChild(placeholder);

    if (src) {
        const img = document.createElement("img");

        img.alt = `Gallery page ${pageNumber}`;
        img.draggable = false;

        img.onload = () => {
            placeholder.style.display = "none";
        };

        img.onerror = () => {
            img.remove();
        };

        img.src = src;
        content.appendChild(img);
    }

    return content;
}


/* =========================================
   3. BUILD PHYSICAL SHEETS
========================================= */

// Each HTML .page represents ONE physical sheet.
// First image = front.
// Second image = back.

const htmlPages = [
    ...book.querySelectorAll(":scope > .page")
];

htmlPages.forEach((page, index) => {
    const images = page.querySelectorAll(":scope > img");

    const frontSrc = images[0]?.getAttribute("src") || null;
    const backSrc = images[1]?.getAttribute("src") || null;

    const sheet = document.createElement("div");
    sheet.className = "sheet";

    // FRONT FACE
    const front = document.createElement("div");
    front.className = "sheet-face sheet-front";

    front.appendChild(
        createPageContent(frontSrc, index * 2 + 1)
    );

    // BACK FACE
    const back = document.createElement("div");
    back.className = "sheet-face sheet-back";

    back.appendChild(
        createPageContent(backSrc, index * 2 + 2)
    );

    sheet.append(front, back);

    sheets.push(sheet);

    // Remove original HTML page.
    page.remove();
});


/* =========================================
   4. PAGE STACK
========================================= */

const stack = document.createElement("div");
stack.className = "page-stack";

sheets.forEach(sheet => {
    stack.appendChild(sheet);
});


/* =========================================
   5. PAGE CLICK AREAS
========================================= */

const leftClick = document.createElement("button");

leftClick.className = "page-click left";
leftClick.type = "button";
leftClick.setAttribute("aria-label", "Previous page");

const rightClick = document.createElement("button");

rightClick.className = "page-click right";
rightClick.type = "button";
rightClick.setAttribute("aria-label", "Next page");

stack.append(leftClick, rightClick);

book.appendChild(stack);


/* =========================================
   6. SHEET DEPTH MANAGEMENT
========================================= */

function rightDepth(index) {
    return 1 + (sheets.length - index) * 0.15;
}

function leftDepth(index) {
    return 5 + index * 0.15;
}

function setSheetDepth(sheet, depth) {
    sheet.style.setProperty("--z", `${depth}px`);
}

function resetSheetDepths() {
    sheets.forEach((sheet, index) => {
        setSheetDepth(sheet, rightDepth(index));
    });
}

resetSheetDepths();


/* =========================================
   7. ANIMATION HELPER
========================================= */

function waitForRotation(element, duration) {
    return new Promise(resolve => {
        let finished = false;

        function finish(event) {
            if (finished) return;

            if (
                event &&
                (
                    event.target !== element ||
                    event.propertyName !== "rotate"
                )
            ) {
                return;
            }

            finished = true;

            clearTimeout(timer);

            element.removeEventListener(
                "transitionend",
                finish
            );

            resolve();
        }

        const timer = setTimeout(
            () => finish(),
            duration + 150
        );

        element.addEventListener(
            "transitionend",
            finish
        );
    });
}


/* =========================================
   8. OPEN BOOK
========================================= */

async function openBook() {
    if (isOpen || isAnimating) return;

    isOpen = true;
    isAnimating = true;

    closeButton.classList.add("visible");

    const animation = waitForRotation(
        cover,
        COVER_MS
    );

    // Move book to centre and rotate cover.
    book.classList.add("open");

    await animation;

    // Reveal pages only after cover finishes opening.
    book.classList.add("opened");

    isAnimating = false;
}

cover.addEventListener("click", openBook);


/* =========================================
   9. CLOSE BOOK
========================================= */

async function closeBook() {
    if (!isOpen || isAnimating) return;

    isOpen = false;
    isAnimating = true;

    closeButton.classList.remove("visible");

    // Hide pages before closing cover.
    book.classList.remove("opened");

    // Reset every sheet.
    sheets.forEach(sheet => {
        sheet.classList.remove("flipped", "turning");
        sheet.style.rotate = "y 0deg";
    });

    flippedCount = 0;

    resetSheetDepths();

    const animation = waitForRotation(
        cover,
        COVER_MS
    );

    book.classList.remove("open");

    await animation;

    isAnimating = false;
}

closeButton.addEventListener("click", closeBook);


/* =========================================
   10. FLIP FORWARD
========================================= */

async function nextPage() {
    if (!isOpen || isAnimating) return;

    if (flippedCount >= sheets.length) return;

    isAnimating = true;

    const index = flippedCount;
    const sheet = sheets[index];

    // Bring active sheet above the others.
    setSheetDepth(sheet, 30);

    sheet.classList.add("turning");

    // Register starting state.
    void sheet.offsetWidth;

    const animation = waitForRotation(
        sheet,
        TURN_MS
    );

    // Rotate sheet to the left.
    sheet.classList.add("flipped");

    await animation;

    sheet.classList.remove("turning");

    // Settle on the left stack.
    setSheetDepth(sheet, leftDepth(index));

    flippedCount++;

    isAnimating = false;
}


/* =========================================
   11. FLIP BACKWARD
========================================= */

async function previousPage() {
    if (!isOpen || isAnimating) return;

    if (flippedCount <= 0) return;

    isAnimating = true;

    const index = flippedCount - 1;
    const sheet = sheets[index];

    // Bring active sheet above the others.
    setSheetDepth(sheet, 30);

    sheet.classList.add("turning");

    void sheet.offsetWidth;

    const animation = waitForRotation(
        sheet,
        TURN_MS
    );

    // Rotate sheet back to the right.
    sheet.classList.remove("flipped");

    await animation;

    sheet.classList.remove("turning");

    setSheetDepth(sheet, rightDepth(index));

    flippedCount--;

    isAnimating = false;
}


/* =========================================
   12. CONNECT INTERACTIONS
========================================= */

leftClick.addEventListener("click", previousPage);

rightClick.addEventListener("click", nextPage);