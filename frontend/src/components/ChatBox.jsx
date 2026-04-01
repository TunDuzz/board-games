import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { socket } from "@/lib/socket";
import { Send, MessageSquare, Smile, Zap, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const ChatBox = ({ roomId, currentUserId, minimal = false, initialMessages = [] }) => {
    const [messages, setMessages] = useState(initialMessages);
    const [inputText, setInputText] = useState("");
    const [showQuickMenu, setShowQuickMenu] = useState(false);
    const scrollRef = useRef(null);

    // Đồng bộ lại tin nhắn khi tin nhắn ban đầu thay đổi (ví dụ khi join phòng)
    useEffect(() => {
        if (initialMessages && initialMessages.length > 0) {
            setMessages(initialMessages);
        }
    }, [initialMessages]);

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

    const content = (
        <div className="flex-1 flex flex-col p-0 min-h-0 relative h-full overflow-hidden">
            <ScrollArea 
                className="flex-1 p-3"
                viewportRef={scrollRef}
            >
                <div className="space-y-2 pr-2">
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
                                className={`flex gap-2 items-start ${isMe ? "justify-end" : "justify-start"}`}
                            >
                                {!isMe && (
                                    <Avatar className="h-7 w-7 border-border/50 border mt-0.5 shrink-0">
                                        <AvatarImage src={msg.avatar || "/default-avatar.png"} alt={msg.username} />
                                        <AvatarFallback className="text-[10px] bg-primary/20 text-primary uppercase font-bold">
                                            {msg.username?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                )}

                                <div className={`flex flex-col ${isMe ? "items-end" : "items-start gap-0.5"}`}>
                                    {!isMe && (
                                        <span className="text-[9px] text-muted-foreground px-1 uppercase font-black tracking-tighter opacity-80">
                                            {msg.username}
                                        </span>
                                    )}
                                    <div 
                                        className={`max-w-[100%] px-3 py-1.5 rounded-2xl text-[12px] break-words shadow-sm leading-tight ${
                                            isMe 
                                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                                            : "bg-muted text-foreground border border-border/50 rounded-tl-none"
                                        }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
            <form 
                onSubmit={handleSendMessage} 
                className="p-2 border-t border-border flex gap-1.5 bg-muted/30 items-center relative"
            >
                {showQuickMenu && (
                    <div className="absolute bottom-[calc(100%+8px)] left-2 right-2 p-3 bg-card border border-border rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Smile className="h-3 w-3" /> Biểu cảm
                                </p>
                                <div className="grid grid-cols-5 gap-2">
                                    {quickEmojis.map(emoji => (
                                        <button 
                                            key={emoji}
                                            type="button"
                                            onClick={() => sendQuickMessage(emoji)}
                                            className="text-xl hover:scale-125 transition-transform duration-100 p-1"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-2 border-t border-border">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Zap className="h-3 w-3" /> Tin nhắn nhanh
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {quickPhrases.map(phrase => (
                                        <button 
                                            key={phrase}
                                            type="button"
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
                <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-muted-foreground hover:text-primary shrink-0"
                    onClick={() => setShowQuickMenu(!showQuickMenu)}
                >
                    <Smile className={`h-4 w-4 ${showQuickMenu ? 'text-primary' : ''}`} />
                </Button>
                <Input 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="h-8 text-xs bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary flex-1"
                />
                <Button type="submit" size="sm" className="h-8 px-3 shrink-0">
                    <Send className="h-3.5 w-3.5" />
                </Button>
            </form>
        </div>
    );

    if (minimal) return content;

    return (
        <Card className="flex flex-col h-full border-border bg-card shadow-lg relative">
            <CardHeader className="py-2 px-3 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-primary uppercase tracking-widest">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Trò chuyện
                </CardTitle>
            </CardHeader>
            <div className="flex-1 flex flex-col p-0 min-h-0 relative bg-background">
                {content}
            </div>
        </Card>
    );
};

export default ChatBox;
