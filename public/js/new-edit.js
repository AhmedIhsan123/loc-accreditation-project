import { Department } from "./department.js";
import { Program } from "./program.js";
import { data } from "./script.js";

const form = {
	ref: document.getElementById("page-form"),
	inputFields: new Map([
		["division", document.getElementById("division-select")],
		["chair", document.getElementById("chair-input")],
		["dean", document.getElementById("dean-input")],
		["loc", document.getElementById("loc-input")],
		["pen", document.getElementById("pen-input")],
	]),
	fieldsArr: document.querySelectorAll(".input-fields"),
	btns: new Map([
		["save", document.getElementById("save-btn")],
		["cancel", document.getElementById("cancel-btn")],
	]),
	departments: data.departments,
};

// Track unsaved changes and current division
let hasUnsavedChanges = false;
let currentDivision = null;

populateDepartmentDropdown();
addEventListeners();
form.ref.addEventListener("submit", function (event) {
	event.preventDefault();
});

function populateDepartmentDropdown() {
	const divisionSelect = form.inputFields.get("division");

	form.departments.forEach((dept) => {
		const option = document.createElement("option");
		option.value = dept.getDivName();
		option.textContent = dept.getDivName();
		divisionSelect.appendChild(option);
	});
}

function addEventListeners() {
	const divisionSelect = form.inputFields.get("division");
	const saveBtn = form.btns.get("save");

	divisionSelect.addEventListener("change", handleDivisionChange);
	saveBtn.addEventListener("click", saveEdits);
}

document.addEventListener("click", function (e) {
	const button = e.target;

	console.log(
		"Click detected:",
		button.textContent,
		button.id,
		button.className
	);

	if (button.id === "save-program-btn") {
		e.preventDefault();
		console.log("Save Program button clicked!");
		saveProgramData();
		markAsSaved();
		return;
	}

	if (button.id === "cancel-program-btn") {
		e.preventDefault();
		console.log("Cancel Program button clicked!");
		cancelProgramChanges();
		return;
	}

	if (
		button.textContent.trim() === "Add" &&
		button.closest(".payee-container")
	) {
		e.preventDefault();
		console.log("Add button detected!");
		addPayee(button);
		markAsUnsaved();
		return;
	}

	if (button.classList && button.classList.contains("remove-payee-btn")) {
		e.preventDefault();
		console.log("Remove button detected!");
		removeSpecificPayee(button);
		markAsUnsaved();
		return;
	}
});

document.addEventListener("input", function (e) {
	if (
		e.target.closest(".payee-container") ||
		e.target.id === "x-program-notes" ||
		e.target.type === "checkbox"
	) {
		markAsUnsaved();
	}
});

function markAsUnsaved() {
	hasUnsavedChanges = true;
	const saveBtn = document.getElementById("save-program-btn");
	if (saveBtn) {
		saveBtn.style.fontWeight = "bold";
		saveBtn.textContent = "Save Program *";
	}
}

function markAsSaved() {
	hasUnsavedChanges = false;
	const saveBtn = document.getElementById("save-program-btn");
	if (saveBtn) {
		saveBtn.style.fontWeight = "normal";
		saveBtn.textContent = "Save Program";
	}
}

function handleDivisionChange() {
	const divisionSelect = form.inputFields.get("division");
	const selectedDivision = divisionSelect.value;

	// Warn about unsaved changes
	if (hasUnsavedChanges && currentDivision) {
		const confirmSwitch = confirm(
			"You have unsaved changes. Do you want to discard them?"
		);
		if (!confirmSwitch) {
			divisionSelect.value = currentDivision;
			return;
		}
	}

	if (selectedDivision === "") {
		clearInputs();
		currentDivision = null;
		markAsSaved();
		return;
	}

	// Load department data
	const dept = form.departments.find(
		(d) => d.getDivName() === selectedDivision
	);

	if (dept) {
		form.inputFields.get("chair").value = dept.getChairName();
		form.inputFields.get("dean").value = dept.getDeanName();
		form.inputFields.get("loc").value = dept.getLocRep();
		form.inputFields.get("pen").value = dept.getPenContact();

		if (dept.programList && dept.programList.length > 0) {
			loadProgramData(selectedDivision, dept.programList[0].getProgramName());
		}

		currentDivision = selectedDivision;
		markAsSaved();
	}
}

function addPayee(button) {
	console.log("addPayee called!");

	const payeeContainer = button.closest(".payee-container");
	const programId = payeeContainer.id.replace("-payee-container", "");

	console.log("Program ID:", programId);

	const existingPayees = payeeContainer.querySelectorAll(".payee-item");
	const newPayeeNumber = existingPayees.length + 1;

	console.log("New payee number:", newPayeeNumber);

	const payeeWrapper = document.createElement("div");
	payeeWrapper.className = "payee-item";
	payeeWrapper.dataset.payeeNumber = newPayeeNumber;

	// Unique program ids assinged to payees in each program to prevents against duplicate ids across departments
	const newPayeeLabel = document.createElement("label");
	newPayeeLabel.setAttribute("for", `${programId}-payee-${newPayeeNumber}`);
	newPayeeLabel.textContent = `Payee #${newPayeeNumber}`;

	const newInputSection = document.createElement("div");
	newInputSection.className = "program-payee-input-section";
	newInputSection.innerHTML = `
		<input
			type="text"
			name="${programId}-payee-name-${newPayeeNumber}"
			id="${programId}-payee-${newPayeeNumber}"
			placeholder="John Smith"
		/>
		<input
			type="number"
			name="${programId}-payee-amount-${newPayeeNumber}"
			id="${programId}-payee-${newPayeeNumber}-money"
			placeholder="Amount"
			step="0.01"
		/>
		<button type="button" class="remove-payee-btn">Remove</button>
	`;

	payeeWrapper.appendChild(newPayeeLabel);
	payeeWrapper.appendChild(newInputSection);

	const addButtonContainer = button.parentElement;
	payeeContainer.insertBefore(payeeWrapper, addButtonContainer);

	console.log("Payee added successfully!");
}

function removeSpecificPayee(button) {
	const payeeContainer = button.closest(".payee-container");

	if (!payeeContainer) {
		console.error("Could not find payee container");
		return;
	}

	const payeeItem = button.closest(".payee-item");
	const payeeItems = payeeContainer.querySelectorAll(".payee-item");

	if (payeeItems.length <= 1) {
		alert("You must have at least one payee.");
		return;
	}

	if (payeeItem) {
		payeeItem.remove();
		renumberPayees(payeeContainer);
		console.log("Payee removed!");
	}
}

function renumberPayees(payeeContainer) {
	const payeeItems = payeeContainer.querySelectorAll(".payee-item");
	const programId = payeeContainer.id.replace("-payee-container", "");

	payeeItems.forEach((item, index) => {
		const number = index + 1;
		item.dataset.payeeNumber = number;

		const label = item.querySelector("label");
		label.textContent = `Payee #${number}`;
		label.setAttribute("for", `${programId}-payee-${number}`);

		const nameInput = item.querySelector('input[type="text"]');
		const amountInput = item.querySelector('input[type="number"]');

		nameInput.id = `${programId}-payee-${number}`;
		nameInput.name = `${programId}-payee-name-${number}`;

		amountInput.id = `${programId}-payee-${number}-money`;
		amountInput.name = `${programId}-payee-amount-${number}`;
	});
}

function loadProgramData(divisionName, programName) {
	const dept = form.departments.find((d) => d.getDivName() === divisionName);
	if (!dept) return;

	const program = dept.programList.find(
		(p) => p.getProgramName() === programName
	);
	if (!program) return;

	const payeeContainer = document.querySelector(".payee-container");
	const payees = program.getPayees();

	// Clear existing payees except the first one
	const existingPayees = payeeContainer.querySelectorAll(".payee-item");
	existingPayees.forEach((item, index) => {
		if (index > 0) item.remove();
	});

	// Populate payees
	const payeeEntries = Object.entries(payees);
	payeeEntries.forEach(([name, amount], index) => {
		if (index === 0) {
			const firstNameInput = document.querySelector("#x-program-payee-1");
			const firstAmountInput = document.querySelector(
				"#x-program-payee-1-money"
			);
			if (firstNameInput) firstNameInput.value = name;
			if (firstAmountInput) firstAmountInput.value = amount;
		} else {
			const addButton = document.getElementById("add-payee-btn");
			addPayee(addButton);

			// Populate the newly added payee
			const newPayeeItems = payeeContainer.querySelectorAll(".payee-item");
			const newItem = newPayeeItems[newPayeeItems.length - 1];
			const nameInput = newItem.querySelector('input[type="text"]');
			const amountInput = newItem.querySelector('input[type="number"]');
			if (nameInput) nameInput.value = name;
			if (amountInput) amountInput.value = amount;
		}
	});

	const paidCheckbox = document.getElementById("x-program-paid");
	const submittedCheckbox = document.getElementById("x-program-submitted");
	if (paidCheckbox) paidCheckbox.checked = program.getHasBeenPaid();
	if (submittedCheckbox)
		submittedCheckbox.checked = program.getReportSubmitted();

	const notesTextarea = document.getElementById("x-program-notes");
	if (notesTextarea) notesTextarea.value = program.getNotes();
}

function saveProgramData() {
	const divisionSelect = form.inputFields.get("division");
	const selectedDivision = divisionSelect.value.trim();

	const dept = form.departments.find(
		(d) => d.getDivName() === selectedDivision
	);
	if (!dept) return;

	const program = dept.programList[0];
	if (!program) return;

	// Collect payees from the form
	const payeeContainer = document.querySelector(".payee-container");
	const payeeItems = payeeContainer.querySelectorAll(".payee-item");
	const newPayees = {};

	payeeItems.forEach((item) => {
		const nameInput = item.querySelector('input[type="text"]');
		const amountInput = item.querySelector('input[type="number"]');

		if (nameInput && amountInput && nameInput.value.trim()) {
			newPayees[nameInput.value.trim()] = parseFloat(amountInput.value) || 0;
		}
	});

	program.setPayees(newPayees);

	const paidCheckbox = document.getElementById("x-program-paid");
	const submittedCheckbox = document.getElementById("x-program-submitted");
	if (paidCheckbox) program.setHasBeenPaid(paidCheckbox.checked);
	if (submittedCheckbox) program.setReportSubmitted(submittedCheckbox.checked);

	const notesTextarea = document.getElementById("x-program-notes");
	if (notesTextarea) program.setNotes(notesTextarea.value);

	console.log("Program data saved:", program);
}

function cancelProgramChanges() {
	if (hasUnsavedChanges) {
		const confirmCancel = confirm("Discard unsaved changes?");
		if (!confirmCancel) return;
	}

	// Reload the current program data
	const divisionSelect = form.inputFields.get("division");
	const selectedDivision = divisionSelect.value;

	if (selectedDivision) {
		const dept = form.departments.find(
			(d) => d.getDivName() === selectedDivision
		);
		if (dept && dept.programList && dept.programList.length > 0) {
			loadProgramData(selectedDivision, dept.programList[0].getProgramName());
			markAsSaved();
		}
	}
}

function saveEdits() {
	const divisionSelect = form.inputFields.get("division");
	const chairRef = form.inputFields.get("chair");
	const deanRef = form.inputFields.get("dean");
	const locRef = form.inputFields.get("loc");
	const penRef = form.inputFields.get("pen");

	const selectedDivision = divisionSelect.value.trim();

	// Input Validation
	let isValid = true;

	if (chairRef.value.trim() === "") {
		isValid = false;
		document.getElementById("err-chair").style.display = "inline";
	} else {
		document.getElementById("err-chair").style.display = "none";
	}

	if (deanRef.value.trim() === "") {
		isValid = false;
		document.getElementById("err-dean").style.display = "inline";
	} else {
		document.getElementById("err-dean").style.display = "none";
	}

	if (locRef.value.trim() === "") {
		isValid = false;
		document.getElementById("err-loc").style.display = "inline";
	} else {
		document.getElementById("err-loc").style.display = "none";
	}

	if (penRef.value.trim() === "") {
		isValid = false;
		document.getElementById("err-pen").style.display = "inline";
	} else {
		document.getElementById("err-pen").style.display = "none";
	}

	if (!isValid) {
		return;
	}

	form.departments.forEach((dept) => {
		if (dept.getDivName() === selectedDivision) {
			dept.setChairName(chairRef.value);
			dept.setDeanName(deanRef.value);
			dept.setLocRep(locRef.value);
			dept.setPenContact(penRef.value);
		}
	});

	alert("Department info saved successfully!");
}

function clearInputs() {
	form.fieldsArr.forEach((el) => (el.value = ""));
}
