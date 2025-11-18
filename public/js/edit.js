const divSelector = document.getElementById("division-select");
const deanInput = document.getElementById("dean-input");
const penInput = document.getElementById("pen-input");
const locInput = document.getElementById("loc-input");
const chairInput = document.getElementById("chair-input");

// Get all program cards once
const programsArray = document.querySelectorAll(".program");

divSelector.addEventListener("change", () => {
	const selectedOption = divSelector.selectedOptions[0];

	// Autofill Dean, PEN, LOC, Chair
	deanInput.value = selectedOption.dataset.dean || "";
	penInput.value = selectedOption.dataset.pen || "";
	locInput.value = selectedOption.dataset.loc || "";
	chairInput.value = selectedOption.dataset.chair || "";

	// Hide all program cards
	programsArray.forEach((program) => (program.style.display = "none"));

	const divisionName = divSelector.value;
	if (!divisionName) return;

	// Show programs for the selected division
	const division = window.serverDepartments.find(
		(d) => d.divisionName === divisionName
	);
	if (!division || !division.programList) return;

	division.programList.forEach((prog) => {
		const programCard = document.getElementById(`${prog.programName}-program`);
		if (programCard) programCard.style.display = "block";
	});
});
