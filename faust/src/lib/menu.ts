export const getMenuSections = async () => {
  const res = await fetch("https://your-backend-api.com/menu", {
    next: { tags: ["menu"] },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch menu");
  }

  return res.json();
};
