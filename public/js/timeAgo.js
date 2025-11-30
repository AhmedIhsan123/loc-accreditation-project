export function timeAgo(timestamp = new Date()) {
	const now = new Date();
	const past = new Date(timestamp);
	const diffMs = now - past;

	// Convert to seconds
	const diffSeconds = Math.floor(diffMs / 1000);

	if (diffSeconds < 60) {
		return "just now";
	}

	const diffMinutes = Math.floor(diffSeconds / 60);
	if (diffMinutes < 60) {
		return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
	}

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) {
		return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
	}

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) {
		return diffDays === 1 ? "yesterday" : `${diffDays} days ago`;
	}

	const diffWeeks = Math.floor(diffDays / 7);
	if (diffWeeks < 4) {
		return diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`;
	}

	const diffMonths = Math.floor(diffDays / 30);
	if (diffMonths < 12) {
		return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
	}

	const diffYears = Math.floor(diffDays / 365);
	return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
}
