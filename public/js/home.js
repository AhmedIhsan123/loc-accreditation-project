import { data } from "./data.js";

// Global variables
const container = document.getElementById("division-cards-section");

createDivisionCards();

function createDivisionCards() {
	data.departments.forEach((division) => {
		// Create the card div
		const card = document.createElement("div");
		card.classList.add("div-card");

		// Create the card title div
		const titleDiv = document.createElement("div");
		titleDiv.classList.add("card-title");

		// Create the paragraph and set the text
		const p = document.createElement("p");
		p.textContent = division.divisionName;

		// Append the paragraph to the title div, then title div to the card
		titleDiv.appendChild(p);
		card.appendChild(titleDiv);

		// Append the card to the container
		container.appendChild(card);

		// Fill data, pass division directly
		fillCardData(card, division);
	});
}

function fillCardData(card, division) {
	// Create a container for contacts
	const contactsDiv = document.createElement("div");
	contactsDiv.classList.add("card-contacts");

	// Create contact elements
	const dean = document.createElement("p");
	dean.textContent = `Dean: ${division.deanName}`;
	const chair = document.createElement("p");
	chair.textContent = `Chair: ${division.chairName}`;
	const loc = document.createElement("p");
	loc.textContent = `Local Rep: ${division.locRep}`;
	const pen = document.createElement("p");
	pen.textContent = `PEN: ${division.penContact}`;

	// Append contacts to container
	contactsDiv.append(dean, chair, loc, pen);
	card.appendChild(contactsDiv);

	// Create a container for programs
	const programsContainer = document.createElement("div");
	programsContainer.classList.add("programs-container");

	// Loop through programs and create mini cards
	division.programList.forEach((program) => {
		const programCard = document.createElement("div");
		programCard.classList.add("program-card");

		const programName = document.createElement("p");
		programName.textContent = program.programName;

		programCard.appendChild(programName);
		programsContainer.appendChild(programCard);
	});

	// Append programs container to the division card
	card.appendChild(programsContainer);
}
