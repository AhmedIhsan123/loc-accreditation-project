import { data } from "./data.js";

/* ----------------------------
   Top-level DOM references
   ---------------------------- */
const pForm = {
	ref: document.getElementById("page-form"),

	selectFieldset: {
		ref: document.getElementById("div-select-set"),
		divisionSelector: document.getElementById("division-select"),

		deanRef: document.getElementById("dean-input"),
		deanErrRef: document.getElementById("err-dean"),

		penRef: document.getElementById("pen-input"),
		penErrRef: document.getElementById("err-pen"),

		locRef: document.getElementById("loc-input"),
		locErrRef: document.getElementById("err-loc"),

		chairRef: document.getElementById("chair-input"),
		chairErrRef: document.getElementById("err-chair"),
	},

	programsFieldset: {
		ref: document.getElementById("programs-container"),
	},
};

// The currently selected department object from `data`
let selectedDivision = data.departments[0] || null;

/* ----------------------------
   UI Control Elements (buttons)
   Created once and appended into the contact area
   ---------------------------- */
const contactFields = [
	pForm.selectFieldset.deanRef,
	pForm.selectFieldset.penRef,
	pForm.selectFieldset.locRef,
	pForm.selectFieldset.chairRef,
];

const contactEditBtn = createButton("Edit");
const contactSaveBtn = createButton("Save");
const contactCancelBtn = createButton("Cancel");

pForm.selectFieldset.ref.append(
	contactEditBtn,
	contactSaveBtn,
	contactCancelBtn
);

/* ----------------------------
   Utility / DOM Helpers
   ---------------------------- */
/**
 * Create a button element with type="button"
 * @param {string} text
 * @returns {HTMLButtonElement}
 */
function createButton(text) {
	const btn = document.createElement("button");
	btn.type = "button";
	btn.textContent = text;
	return btn;
}

/**
 * Safely set enabled/disabled state for an array of form fields
 * @param {HTMLElement[]} elements
 * @param {boolean} enabled
 */
function setEnabled(elements, enabled) {
	elements.forEach((el) => {
		el.disabled = !enabled;
		el.style.backgroundColor = enabled ? "" : "#eee";
		el.style.cursor = enabled ? "default" : "not-allowed";
	});
}

/**
 * Clear a container's children
 * @param {HTMLElement} container
 */
function clearContainer(container) {
	container.innerHTML = "";
}

/* ----------------------------
   Division selector population
   ---------------------------- */
function fillDivisionSelector() {
	const selector = pForm.selectFieldset.divisionSelector;
	// Defensive: ensure selector exists
	if (!selector) return;

	// First clear any existing options (in case function is re-run)
	selector.innerHTML = "";

	// Add a placeholder option
	const placeholder = document.createElement("option");
	placeholder.value = "";
	placeholder.textContent = "-- Select division --";
	selector.appendChild(placeholder);

	data.departments.forEach((dep) => {
		const opt = document.createElement("option");
		opt.value = dep.divisionName;
		opt.textContent = dep.divisionName;
		selector.appendChild(opt);
	});
}

/* ----------------------------
   Program card UI toggles
   ---------------------------- */
function greyOutContactInfo() {
	setEnabled(contactFields, false);
	contactEditBtn.style.display = "inline-block";
	contactSaveBtn.style.display = "none";
	contactCancelBtn.style.display = "none";
}

function toggleProgramCard(fieldsetRef, enabled) {
	// Disable/enable inputs and textareas
	fieldsetRef.querySelectorAll("input, textarea").forEach((el) => {
		el.disabled = !enabled;
		el.style.backgroundColor = enabled ? "" : "#eee";
		el.style.cursor = enabled ? "auto" : "not-allowed";
	});

	// Show/hide remove buttons and add button
	fieldsetRef.querySelectorAll(".remove-payee-btn").forEach((btn) => {
		btn.disabled = !enabled;
		btn.style.display = enabled ? "inline-block" : "none";
	});

	const addBtn = fieldsetRef.querySelector(".payee-container > div > button");
	if (addBtn) {
		addBtn.disabled = !enabled;
		addBtn.style.display = enabled ? "inline-block" : "none";
	}
}

function greyOutProgramCard(fieldsetRef) {
	toggleProgramCard(fieldsetRef, false);
}

function enableProgramCard(fieldsetRef) {
	toggleProgramCard(fieldsetRef, true);
}

/* ----------------------------
   Program card rendering
   ---------------------------- */
function createProgramCards(division) {
	const parent = pForm.programsFieldset.ref;
	if (!parent) return;

	clearContainer(parent);

	if (!division) {
		contactEditBtn.style.display = "none";
		return;
	}

	contactEditBtn.style.display = "inline-block";

	division.programList.forEach((program) => {
		const card = buildProgramCard(program);
		parent.appendChild(card);
		greyOutProgramCard(card);
	});
}

function buildProgramCard(program) {
	const fieldset = document.createElement("fieldset");
	fieldset.classList.add("program");
	fieldset.id = `${program.programName
		.toLowerCase()
		.replace(/\s+/g, "-")}-program`;

	// Title
	const title = document.createElement("p");
	title.classList.add("p-title");
	title.textContent = program.programName;
	fieldset.appendChild(title);

	// Payee section
	const payeeSection = createPayeeSection(program);
	fieldset.appendChild(payeeSection);

	// Money/checkboxes
	const moneySection = createMoneySection(program);
	fieldset.appendChild(moneySection);

	// Notes
	const notesSection = createNotesSection(program);
	fieldset.appendChild(notesSection);

	// Buttons
	const buttons = createProgramButtons(
		fieldset,
		program,
		payeeSection,
		notesSection
	);
	fieldset.appendChild(buttons);

	return fieldset;
}

function createPayeeSection(program) {
	const section = document.createElement("section");
	section.classList.add("payee-container", "program-sections");

	const controlDiv = document.createElement("div");
	const addBtn = createButton("Add");
	controlDiv.appendChild(addBtn);
	section.appendChild(controlDiv);

	addBtn.onclick = () => addPayee(section, program.programName, controlDiv);

	// Populate existing payees (guarding for different shapes)
	const payees = program.payees || {};
	Object.entries(payees).forEach(([name, amt]) => {
		// present amount as string in the input; internal model will convert on save
		addPayee(section, program.programName, controlDiv, name, String(amt));
	});

	return section;
}

function createMoneySection(program) {
	const fs = document.createElement("fieldset");
	fs.classList.add("program-money-section");

	// Helper to create a labeled checkbox
	const makeCheckboxRow = (labelText, initialChecked) => {
		const div = document.createElement("div");
		const label = document.createElement("label");
		label.textContent = labelText;
		const input = document.createElement("input");
		input.type = "checkbox";
		input.checked = !!initialChecked;
		div.append(label, input);
		return { div, input };
	};

	const paidRow = makeCheckboxRow("Has been paid", program.hasBeenPaid);
	const submittedRow = makeCheckboxRow("Submitted", program.reportSubmitted);

	fs.appendChild(paidRow.div);
	fs.appendChild(document.createElement("hr"));
	fs.appendChild(submittedRow.div);

	// Store references on the fieldset for later reads (simple local cache)
	fs._paidInput = paidRow.input;
	fs._submittedInput = submittedRow.input;

	return fs;
}

function createNotesSection(program) {
	const fs = document.createElement("fieldset");
	fs.classList.add("program-notes-section");

	const label = document.createElement("label");
	label.textContent = "Notes";

	const textarea = document.createElement("textarea");
	textarea.value = program.notes || "";

	fs.append(label, textarea);
	return fs;
}

function createProgramButtons(fieldsetRef, program, payeeSection, notesField) {
	const container = document.createElement("div");
	container.classList.add("program-buttons");

	const editBtn = createButton("Edit");
	const saveBtn = createButton("Save Program");
	const cancelBtn = createButton("Cancel");

	container.append(editBtn, saveBtn, cancelBtn);

	saveBtn.style.display = "none";
	cancelBtn.style.display = "none";

	editBtn.onclick = () =>
		enterProgramEditMode(
			fieldsetRef,
			program,
			payeeSection,
			notesField,
			editBtn,
			saveBtn,
			cancelBtn
		);

	return container;
}

/* ----------------------------
   Program Edit Mode (capture / restore / save)
   ---------------------------- */
function enterProgramEditMode(
	fieldsetRef,
	program,
	payeeSection,
	notesField,
	editBtn,
	saveBtn,
	cancelBtn
) {
	const originalState = captureProgramState(
		payeeSection,
		notesField,
		fieldsetRef,
		program
	);

	enableProgramCard(fieldsetRef);
	editBtn.style.display = "none";
	saveBtn.style.display = "inline-block";
	cancelBtn.style.display = "inline-block";

	cancelBtn.onclick = () =>
		restoreProgramState(
			originalState,
			fieldsetRef,
			payeeSection,
			notesField,
			program,
			editBtn,
			saveBtn,
			cancelBtn
		);
	saveBtn.onclick = () =>
		saveProgramState(
			payeeSection,
			notesField,
			fieldsetRef,
			program,
			editBtn,
			saveBtn,
			cancelBtn
		);
}

/**
 * Capture the current editable UI state (used when entering edit mode)
 */
function captureProgramState(payeeSection, notesField, fieldsetRef, program) {
	// Capture payees as name -> string (as presented in inputs)
	const payees = Object.fromEntries(
		[...payeeSection.querySelectorAll(".payee-item")].map((item) => {
			const name = item.querySelector("input[type=text]").value;
			const amt = item.querySelector("input[type=number]").value;
			return [name, amt];
		})
	);

	// capture notes
	const notes = notesField.querySelector("textarea").value;

	// capture checkbox states from the money section (assumes single money section exists)
	const paidInput = fieldsetRef.querySelector(
		".program-money-section"
	)?._paidInput;
	const submittedInput = fieldsetRef.querySelector(
		".program-money-section"
	)?._submittedInput;

	return {
		notes,
		payees,
		hasBeenPaid: paidInput ? paidInput.checked : !!program.hasBeenPaid,
		reportSubmitted: submittedInput
			? submittedInput.checked
			: !!program.reportSubmitted,
	};
}

function restoreProgramState(
	state,
	fieldsetRef,
	payeeSection,
	notesField,
	program,
	editBtn,
	saveBtn,
	cancelBtn
) {
	// Restore notes
	notesField.querySelector("textarea").value = state.notes;

	// Remove current payees then re-add preserved ones
	payeeSection.querySelectorAll(".payee-item").forEach((el) => el.remove());
	const controlDiv = payeeSection.querySelector("div");
	Object.entries(state.payees).forEach(([name, amt]) => {
		addPayee(payeeSection, program.programName, controlDiv, name, amt);
	});

	// Restore checkbox values into the program object (so display matches underlying data)
	program.hasBeenPaid = state.hasBeenPaid;
	program.reportSubmitted = state.reportSubmitted;

	greyOutProgramCard(fieldsetRef);
	editBtn.style.display = "inline-block";
	saveBtn.style.display = "none";
	cancelBtn.style.display = "none";
}

/**
 * Save edited program fields back into the program object.
 * IMPORTANT: payee amounts are converted to numbers here (Option 2 chosen).
 */
function saveProgramState(
	payeeSection,
	notesField,
	fieldsetRef,
	program,
	editBtn,
	saveBtn,
	cancelBtn
) {
	// Notes
	program.notes = notesField.querySelector("textarea").value;

	// Payees: convert amounts to numbers (fallback to 0 if invalid)
	const newPayees = {};
	let hasValidationError = false;
	payeeSection.querySelectorAll(".payee-item").forEach((item) => {
		const nameInput = item.querySelector("input[type=text]");
		const amountInput = item.querySelector("input[type=number]");

		const name = nameInput.value.trim();
		const amtRaw = amountInput.value.trim();

		// Case 1: Both empty → remove the row
		if (name === "" && amtRaw === "") {
			item.remove();
			return;
		}

		// Case 2: name is missing
		if (name === "") {
			hasValidationError = true;
			nameInput.style.border = name === "" ? "1px solid red" : "";

			// Reset border when user clicks the input
			nameInput.onclick = () => {
				nameInput.style.border = "";
			};
		}

		if (amtRaw === "") {
			hasValidationError = true;
			console.log(amtRaw === "");
			amountInput.style.border = amtRaw === "" ? "1px solid red" : "";
			amountInput.onclick = () => {
				amountInput.style.border = "";
			};
			console.log(1);
		}

		// Exit if there is an error
		if (hasValidationError) {
			return;
		}

		// Case 3: Both present → convert amount to number
		const amt = Number.parseFloat(amtRaw);
		newPayees[name] = Number.isFinite(amt) ? amt : 0;
	});

	// Stop save if validation failed
	if (hasValidationError) {
		return; // stay in edit mode
	}

	program.payees = newPayees;

	// Checkboxes
	const moneySection = fieldsetRef.querySelector(".program-money-section");
	if (moneySection) {
		const paidInput = moneySection._paidInput;
		const submittedInput = moneySection._submittedInput;
		if (paidInput) program.hasBeenPaid = paidInput.checked;
		if (submittedInput) program.reportSubmitted = submittedInput.checked;
	}

	// Disable editing and reset button visibility
	greyOutProgramCard(fieldsetRef);
	editBtn.style.display = "inline-block";
	saveBtn.style.display = "none";
	cancelBtn.style.display = "none";

	// Log values for testing
	console.log(data);
}

/* ----------------------------
   Payee helpers
   ---------------------------- */
function addPayee(section, programName, controlDiv, name = "", amount = "") {
	const index = section.querySelectorAll(".payee-item").length + 1;

	const wrapper = document.createElement("div");
	wrapper.classList.add("payee-item");

	const label = document.createElement("label");
	label.htmlFor = `${programName
		.toLowerCase()
		.replace(/\s+/g, "-")}-payee-${index}`;
	label.textContent = `Payee #${index}`;

	const inputRow = document.createElement("div");
	inputRow.classList.add("program-payee-input-section");

	const nameInput = document.createElement("input");
	nameInput.type = "text";
	nameInput.id = `${programName
		.toLowerCase()
		.replace(/\s+/g, "-")}-payee-${index}`;
	nameInput.value = name;

	const amountInput = document.createElement("input");
	amountInput.type = "number";
	amountInput.id = `${programName
		.toLowerCase()
		.replace(/\s+/g, "-")}-payee-${index}-money`;
	amountInput.value = amount;
	amountInput.placeholder = "$";
	amountInput.step = "0.01";

	const removeBtn = createButton("Remove");
	removeBtn.classList.add("remove-payee-btn");
	removeBtn.onclick = () => {
		wrapper.remove();
		updatePayeeNumbers(section);
	};

	inputRow.append(nameInput, amountInput, removeBtn);
	wrapper.append(label, inputRow);

	section.insertBefore(wrapper, controlDiv);
}

function updatePayeeNumbers(section) {
	section.querySelectorAll(".payee-item").forEach((div, i) => {
		const label = div.querySelector("label");
		if (label) label.textContent = `Payee #${i + 1}`;
		// keep input ids in sync (optional)
		const nameInput = div.querySelector("input[type=text]");
		const moneyInput = div.querySelector("input[type=number]");
		if (nameInput)
			nameInput.id = nameInput.id.replace(/-payee-\d+/, `-payee-${i + 1}`);
		if (moneyInput)
			moneyInput.id = moneyInput.id.replace(
				/-payee-\d+-money/,
				`-payee-${i + 1}-money`
			);
	});
}

/* ----------------------------
   Contact info edit/save/restore
   ---------------------------- */
contactEditBtn.onclick = () => {
	const snapshot = captureContactState();
	setEnabled(contactFields, true);

	contactEditBtn.style.display = "none";
	contactSaveBtn.style.display = "inline-block";
	contactCancelBtn.style.display = "inline-block";

	contactCancelBtn.onclick = () => restoreContactState(snapshot);
	contactSaveBtn.onclick = () => saveContactState();
};

function captureContactState() {
	return {
		dean: pForm.selectFieldset.deanRef.value,
		pen: pForm.selectFieldset.penRef.value,
		loc: pForm.selectFieldset.locRef.value,
		chair: pForm.selectFieldset.chairRef.value,
	};
}

function restoreContactState(state) {
	// put the snapshot back into the selectedDivision and update UI
	if (!selectedDivision) return;

	// Clear validation borders (VERY IMPORTANT)
	const inputs = [
		pForm.selectFieldset.deanRef,
		pForm.selectFieldset.penRef,
		pForm.selectFieldset.locRef,
		pForm.selectFieldset.chairRef,
	];

	inputs.forEach((input) => {
		input.style.border = ""; // reset border
	});

	// Restore saved state
	selectedDivision.deanName = state.dean;
	selectedDivision.penContact = state.pen;
	selectedDivision.locRep = state.loc;
	selectedDivision.chairName = state.chair;

	// Update UI and lock fields
	updateContactInfo(selectedDivision.divisionName);
	greyOutContactInfo();

	// Log values for testing
	console.log(data);
}

function saveContactState() {
	if (!selectedDivision) return;

	// Track validation status
	let hasError = false;

	// List of required textboxes
	const requiredFields = [
		pForm.selectFieldset.deanRef,
		pForm.selectFieldset.penRef,
		pForm.selectFieldset.locRef,
		pForm.selectFieldset.chairRef,
	];

	requiredFields.forEach((input) => {
		const value = input.value.trim();

		// If empty → highlight
		if (value === "") {
			hasError = true;
			input.style.border = "2px solid red";

			// Remove border once user interacts again
			input.addEventListener(
				"input",
				() => {
					input.style.border = "";
				},
				{ once: true }
			);
		}
	});

	// Stop save if invalid
	if (hasError) {
		return;
	}

	// Save values if all good
	selectedDivision.deanName = pForm.selectFieldset.deanRef.value.trim();
	selectedDivision.penContact = pForm.selectFieldset.penRef.value.trim();
	selectedDivision.locRep = pForm.selectFieldset.locRef.value.trim();
	selectedDivision.chairName = pForm.selectFieldset.chairRef.value.trim();

	// Lock UI
	greyOutContactInfo();

	// Debug output
	console.log(data);
}

function updateContactInfo(name) {
	if (!name) {
		setEnabled(contactFields, false);
		contactFields.forEach((el) => (el.value = ""));
		selectedDivision = null;
		return;
	}

	const dept = data.departments.find((d) => d.divisionName === name);
	if (!dept) return;

	selectedDivision = dept;

	pForm.selectFieldset.deanRef.value = dept.deanName || "";
	pForm.selectFieldset.penRef.value = dept.penContact || "";
	pForm.selectFieldset.locRef.value = dept.locRep || "";
	pForm.selectFieldset.chairRef.value = dept.chairName || "";

	setEnabled(contactFields, false);
}

function updateProgramCards(name) {
	const dept = data.departments.find((d) => d.divisionName === name);
	createProgramCards(dept);
}

/* ----------------------------
   Initialization
   ---------------------------- */
(function init() {
	fillDivisionSelector();
	clearContainer(pForm.programsFieldset.ref);
	greyOutContactInfo();

	// Wire change event for division selector
	const selector = pForm.selectFieldset.divisionSelector;
	if (selector) {
		selector.addEventListener("change", function () {
			updateContactInfo(this.value);
			updateProgramCards(this.value);
		});
	}
})();
