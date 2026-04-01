export const getRankFromElo = (elo) => {
    if (elo === undefined || elo === null) return "Đồng";
    const e = Number(elo);
    if (e < 200) return "Đồng";
    if (e < 500) return "Bạc";
    if (e < 1000) return "Vàng";
    if (e < 2000) return "Bạch Kim";
    if (e < 3000) return "Kim Cương";
    return "Cao Thủ";
};

export const getRankColor = (rank) => {
    switch (rank) {
        case "Đồng": return "text-orange-900 bg-orange-900/10 border-orange-900/20";
        case "Bạc": return "text-slate-500 bg-slate-500/10 border-slate-500/20";
        case "Vàng": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
        case "Bạch Kim": return "text-cyan-600 bg-cyan-600/10 border-cyan-600/20";
        case "Kim Cương": return "text-blue-600 bg-blue-600/10 border-blue-600/20";
        case "Cao Thủ": return "text-orange-600 bg-orange-600/10 border-orange-600/20";
        default: return "text-slate-500 bg-slate-500/10 border-slate-500/20";
    }
};
