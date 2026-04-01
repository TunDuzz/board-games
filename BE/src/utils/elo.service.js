/**
 * Elo Service for calculating ranking and score changes after matches.
 */
class EloService {
  /**
   * Determine Rank tier based on Elo.
   */
  getRank(elo) {
    if (elo < 200) return { name: "Đồng", color: "#8B4513" };
    if (elo < 500) return { name: "Bạc", color: "#C0C0C0" };
    if (elo < 1000) return { name: "Vàng", color: "#FFD700" };
    if (elo < 2000) return { name: "Bạch Kim", color: "#E5E4E2" };
    if (elo < 3000) return { name: "Kim Cương", color: "#B9F2FF" };
    return { name: "Cao Thủ", color: "#FF4500" };
  }

  /**
   * Calculate Elo change for a match.
   */
  calculateEloChange(currentElo, opponentElo, result, options = {}) {
    const { isRanked = false, isPrivate = false, isAi = false } = options;

    if (isAi) return 0;

    // Chuyển đổi sang số để tránh lỗi cộng chuỗi
    const cElo = Number(currentElo) || 0;
    const oElo = Number(opponentElo) || 0;

    // 1. Xác định hệ số K (K-factor) theo Rank tier
    let K = 15; 
    if (isRanked) {
      if (cElo < 300) K = 30;         // Đồng
      else if (cElo < 800) K = 25;    // Bạc
      else if (cElo < 1500) K = 20;   // Vàng
      else if (cElo < 2500) K = 15;   // Bạch Kim
      else K = 10;                    // Kim Cương +
    }
    
    if (isPrivate) K = 5; // Private: tránh cày điểm

    // 2. Tính điểm thắng thua (S)
    let S = 0.5;
    if (result === "win") S = 1;
    if (result === "lose") S = 0;

    // 3. Tính xác suất thắng (E)
    const E = 1 / (1 + Math.pow(10, (oElo - cElo) / 400));

    // 4. Tính thay đổi ELO cơ bản
    let eloChange = Math.round(K * (S - E));

    // 5. Đảm bảo thắng ít nhất 5 điểm (trừ khi là Ai/Private)
    if (result === "win") {
      if (eloChange <= 0) eloChange = 5;
    }

    return Number(eloChange);
  }
}

module.exports = new EloService();
