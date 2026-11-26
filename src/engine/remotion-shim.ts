// Stands in for the "remotion" package, so old Remotion-style files still build: files in studio/public are at /public/.
export const staticFile = (p: string) => "/public/" + p.replace(/^\/+/, "");
