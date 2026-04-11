const { twMerge } = require("tailwind-merge");
console.log(twMerge("data-[size=default]:h-9", "h-10"));
console.log(twMerge("h-9", "h-10"));
