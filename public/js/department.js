export class Department {
	// Class constructor
	constructor(division, programs, chair, dean, locRep, pen) {
		this.divisionName = division;
		this.programList = programs;
		this.chairName = chair;
		this.deanName = dean;
		this.locRep = locRep;
		this.penContact = pen;
	}

	// Class getters
	getDivName() {
		return this.divisionName;
	}

	getProgramNames() {
		return this.programList;
	}

	getChairName() {
		return this.chairName;
	}

	getDeanName() {
		return this.deanName;
	}

	getLocRep() {
		return this.locRep;
	}

	getPenContact() {
		return this.penContact;
	}

	// Class setters
	setDivName(division) {
		this.divisionName = division;
	}

	setDivName(program) {
		this.programList = program;
	}

	setChairName(chair) {
		this.chairName = chair;
	}

	setDeanName(dean) {
		this.deanName = dean;
	}

	setLocRep(locRep) {
		this.locRep = locRep;
	}

	setPenContact(pen) {
		this.penContact = pen;
	}
}
