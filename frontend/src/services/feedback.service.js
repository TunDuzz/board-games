import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const feedbackService = {
  sendFeedback: async (feedbackData) => {
    const token = localStorage.getItem("token");
    const config = {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    };
    const response = await axios.post(`${API_URL}/feedback`, feedbackData, config);
    return response.data;
  },
};
