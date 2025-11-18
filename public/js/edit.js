// Server-provided departments
const data = { departments: window.serverDepartments || [] };

/* ----------------------------
   DOM references
---------------------------- */
const pForm = {
	selectFieldset: {
		deanRef: document.getElementById("dean-input"),
		penRef: document.getElementById("pen-input"),
		locRef: document.getElementById("loc-input"),
		chairRef: document.getElementById("chair-input"),
	},
	programsFieldset: document.getElementById("programs-container"),
};

let selectedDivision = data.departments[0] || null;

/* ----------------------------
   Contact buttons
---------------------------- */
const contactFields = [
	pForm.selectFieldset.deanRef,
	pForm.selectFieldset.penRef,
	pForm.selectFieldset.locRef,
	pForm.selectFieldset.chairRef,
];

const contactEditBtn = document.createElement("button");
contactEditBtn.type = "button";
contactEditBtn.textContent = "Edit";

const contactSaveBtn = document.createElement("button");
contactSaveBtn.type = "button";
contactSaveBtn.textContent = "Save";
contactSaveBtn.style.display = "none";

const contactCancelBtn = document.createElement("button");
contactCancelBtn.type = "button";
contactCancelBtn.textContent = "Cancel";
contactCancelBtn.style.display = "none";

// Append buttons after the last contact input
pForm.selectFieldset.chairRef.parentElement.append(
	contactEditBtn,
	contactSaveBtn,
	contactCancelBtn
);

/* ----------------------------
   Helpers
---------------------------- */
function setEnabled(elements, enabled) {
	elements.forEach((el) => {
		el.disabled = !enabled;
		el.style.backgroundColor = enabled ? "" : "#eee";
		el.style.cursor = enabled ? "default" : "not-allowed";
	});
}

function greyOutContactInfo() {
	setEnabled(contactFields, false);
	contactEditBtn.style.display = "inline-block";
	contactSaveBtn.style.display = "none";
	contactCancelBtn.style.display = "none";
}

function captureContactState() {
	return {
		dean: pForm.selectFieldset.deanRef.value,
		pen: pForm.selectFieldset.penRef.value,
		loc: pForm.selectFieldset.locRef.value,
		chair: pForm.selectFieldset.chairRef.value,
	};
}

function restoreContactState(state) {
	if (!selectedDivision) return;
	[
		selectedDivision.deanName,
		selectedDivision.penContact,
		selectedDivision.locRep,
		selectedDivision.chairName,
	] = [state.dean, state.pen, state.loc, state.chair];
	updateContactInfo(selectedDivision.divisionName);
	greyOutContactInfo();
	console.log(data);
}

function saveContactState() {
	if (!selectedDivision) return;

	let hasError = false;
	contactFields.forEach((input) => {
		if (input.value.trim() === "") {
			hasError = true;
			input.style.border = "2px solid red";
			input.addEventListener(
				"input",
				() => {
					input.style.border = "";
				},
				{ once: true }
			);
		}
	});

	if (hasError) return;

	selectedDivision.deanName = pForm.selectFieldset.deanRef.value.trim();
	selectedDivision.penContact = pForm.selectFieldset.penRef.value.trim();
	selectedDivision.locRep = pForm.selectFieldset.locRef.value.trim();
	selectedDivision.chairName = pForm.selectFieldset.chairRef.value.trim();

	greyOutContactInfo();
	console.log(data);
}

function updateContactInfo(name) {
	const dept = data.departments.find((d) => d.divisionName === name);
	if (!dept) return;

	selectedDivision = dept;
	pForm.selectFieldset.deanRef.value = dept.deanName || "";
	pForm.selectFieldset.penRef.value = dept.penContact || "";
	pForm.selectFieldset.locRef.value = dept.locRep || "";
	pForm.selectFieldset.chairRef.value = dept.chairName || "";

	setEnabled(contactFields, false);
}

function updateProgramCards(divisionName) {
	const allPrograms = document.querySelectorAll(".program");
	allPrograms.forEach((fieldset) => {
		if (fieldset.dataset.division === divisionName) {
			fieldset.style.display = "block";
		} else {
			fieldset.style.display = "none";
		}
	});
}

/* ----------------------------
   Event Wiring
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

document
	.getElementById("division-select")
	?.addEventListener("change", function () {
		updateContactInfo(this.value);
		updateProgramCards(this.value);
	});

/* ----------------------------
   Initialization
---------------------------- */
(function init() {
	greyOutContactInfo();
	updateProgramCards(document.getElementById("division-select")?.value || "");
})();
