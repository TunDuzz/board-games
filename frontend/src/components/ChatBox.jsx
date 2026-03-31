import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { socket } from "@/lib/socket";
import { Send, MessageSquare, Smile, Zap } from "lucide-react";

const ChatBox = ({ roomId, currentUserId }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [showQuickMenu, setShowQuickMenu] = useState(false);
    const scrollRef = useRef(null);

    const quickEmojis = ["😂", "😍", "🤔", "😮", "😢", "😡", "👍", "👋", "🔥", "🎉"];
    const quickPhrases = [
        "Chào bạn! 👋", 
        "Hay quá! 👏", 
        "Đợi tí nhé... ⏳", 
        "Gần thắng rồi! 🔥", 
        "Chúc may mắn! 🍀", 
        "Chơi tiếp không? 🎮", 
        "Hòa nhé? 🤝"
    ];

    useEffect(() => {
        const handleReceiveMessage = (message) => {
            setMessages((prev) => [...prev, message]);
        };

        socket.on("receive_room_message", handleReceiveMessage);

        return () => {
            socket.off("receive_room_message", handleReceiveMessage);
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        socket.emit("send_room_message", {
            roomId,
            text: inputText.trim()
        });
        setInputText("");
        setShowQuickMenu(false);
    };

    const sendQuickMessage = (text) => {
        socket.emit("send_room_message", {
            roomId,
            text: text
        });
        setShowQuickMenu(false);
    };

    return (
        <Card className="flex flex-col h-full border-primary/20 bg-primary/5 relative">
            <CardHeader className="py-2 px-3 border-b border-primary/10 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    Trò chuyện
                </CardTitle>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setShowQuickMenu(!showQuickMenu)}
                >
                    <Smile className={`h-4 w-4 ${showQuickMenu ? 'text-primary' : 'text-muted-foreground'}`} />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 min-h-0 relative">
                {showQuickMenu && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-card border border-primary/20 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Smile className="h-3 w-3" /> Biểu cảm
                                </p>
                                <div className="grid grid-cols-5 gap-2">
                                    {quickEmojis.map(emoji => (
                                        <button 
                                            key={emoji}
                                            onClick={() => sendQuickMessage(emoji)}
                                            className="text-xl hover:scale-125 transition-transform duration-100 p-1"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-2 border-t border-primary/5">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Zap className="h-3 w-3" /> Tin nhắn nhanh
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {quickPhrases.map(phrase => (
                                        <button 
                                            key={phrase}
                                            onClick={() => sendQuickMessage(phrase)}
                                            className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded-full transition-colors"
                                        >
                                            {phrase}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin"
                >
                    {messages.length === 0 && (
                        <p className="text-[10px] text-center text-muted-foreground italic py-4">
                            Chưa có tin nhắn nào. Gửi lời chào đối thủ đi!
                        </p>
                    )}
                    {messages.map((msg, idx) => {
                        const isMe = msg.userId === currentUserId;
                        return (
                            <div 
                                key={idx} 
                                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                            >
                                <span className="text-[9px] text-muted-foreground mb-0.5 px-1">
                                    {isMe ? "Bạn" : msg.username}
                                </span>
                                <div 
                                    className={`max-w-[85%] px-2.5 py-1.5 rounded-2xl text-xs break-words ${
                                        isMe 
                                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                                        : "bg-background border border-primary/10 rounded-tl-none"
                                    }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <form 
                    onSubmit={handleSendMessage} 
                    className="p-2 border-t border-primary/10 flex gap-1.5"
                >
                    <Input 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Nhập tin nhắn..."
                        className="h-8 text-xs bg-background/50"
                    />
                    <Button type="submit" size="icon" className="h-8 w-8 shrink-0">
                        <Send className="h-3.5 w-3.5" />
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default ChatBox;
