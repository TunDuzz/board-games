export const getRankFromElo = (elo) => {
    if (elo === undefined || elo === null) return "Unranked";
    if (elo < 1000) return "Bronze";
    if (elo < 1300) return "Silver";
    if (elo < 1600) return "Gold";
    if (elo < 1900) return "Platinum";
    if (elo < 2200) return "Diamond";
    return "Master";
};

export const getRankColor = (rank) => {
    switch (rank) {
        case "Bronze": return "text-orange-700 bg-orange-100";
        case "Silver": return "text-slate-700 bg-slate-200";
        case "Gold": return "text-yellow-700 bg-yellow-100";
        case "Platinum": return "text-cyan-700 bg-cyan-100";
        case "Diamond": return "text-blue-700 bg-blue-100";
        case "Master": return "text-purple-700 bg-purple-200";
        default: return "text-gray-700 bg-gray-100";
    }
};
