import api from "./axios";

export async function getUserName() {
  const response = await api.get("/user");
  console.log("Full API response:", response.data);
  // Return the whole response for debugging
  return response.data.name ?? JSON.stringify(response.data);
}