document.addEventListener("DOMContentLoaded", function () {
	// Get form elements
	const emailInput = document.getElementById("email");
	const passwordInput = document.getElementById("password");
	const usernameInput = document.getElementById("username");
	const firstNameInput = document.getElementById("first_name");
	const form = document.querySelector("form");

	// Server error message element
	const serverErrorMessage = document.querySelector(".error-message");

	// Create error message elements dynamically
	function createErrorElement(inputId) {
		const errorDiv = document.createElement("div");
		errorDiv.id = `${inputId}-error`;
		errorDiv.className = "validation-error";
		errorDiv.style.display = "none";
		return errorDiv;
	}

	// Add error div after email input
	const emailError = createErrorElement("email");
	emailInput.parentNode.appendChild(emailError);

	// Add error div after password input (after the hint)
	const passwordError = createErrorElement("password");
	passwordInput.parentNode.appendChild(passwordError);

	// Hide server error when user starts typing in any field
	function hideServerError() {
		if (serverErrorMessage) {
			serverErrorMessage.style.display = "none";
		}
	}

	// Add input listeners to all fields to hide server error
	if (usernameInput) {
		usernameInput.addEventListener("input", hideServerError);
	}
	if (emailInput) {
		emailInput.addEventListener("input", hideServerError);
	}
	if (firstNameInput) {
		firstNameInput.addEventListener("input", hideServerError);
	}
	if (passwordInput) {
		passwordInput.addEventListener("input", hideServerError);
	}

	// Email validation
	emailInput.addEventListener("blur", function () {
		const email = this.value.trim();
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		if (email === "") {
			this.classList.remove("invalid", "valid");
			emailError.style.display = "none";
		} else if (!emailRegex.test(email)) {
			this.classList.add("invalid");
			this.classList.remove("valid");
			emailError.textContent = "Please enter a valid email address";
			emailError.style.display = "block";
		} else {
			this.classList.remove("invalid");
			this.classList.add("valid");
			emailError.style.display = "none";
		}
	});

	// Clear error on input
	emailInput.addEventListener("input", function () {
		if (this.classList.contains("invalid")) {
			this.classList.remove("invalid");
			emailError.style.display = "none";
		}
	});

	// Password validation
	passwordInput.addEventListener("input", function () {
		const password = this.value;

		if (password.length > 0 && password.length < 8) {
			this.classList.add("invalid");
			this.classList.remove("valid");
			passwordError.textContent = "Password must be at least 8 characters";
			passwordError.style.display = "block";
		} else if (password.length >= 8) {
			this.classList.remove("invalid");
			this.classList.add("valid");
			passwordError.style.display = "none";
		} else {
			this.classList.remove("invalid", "valid");
			passwordError.style.display = "none";
		}
	});

	// Form submission validation
	form.addEventListener("submit", function (e) {
		let isValid = true;
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		// Validate email
		const email = emailInput.value.trim();
		if (!emailRegex.test(email)) {
			e.preventDefault();
			emailInput.classList.add("invalid");
			emailError.textContent = "Please enter a valid email address";
			emailError.style.display = "block";
			isValid = false;
		}

		// Validate password
		const password = passwordInput.value;
		if (password.length < 8) {
			e.preventDefault();
			passwordInput.classList.add("invalid");
			passwordError.textContent = "Password must be at least 8 characters";
			passwordError.style.display = "block";
			isValid = false;
		}

		return isValid;
	});
});
