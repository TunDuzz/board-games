import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { feedbackService } from "@/services/feedback.service";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

export function FeedbackModal({ open, onOpenChange }) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setLoading(true);
    try {
      await feedbackService.sendFeedback({ subject, content });
      toast.success("Cảm ơn bạn đã góp ý! Thông tin đã được gửi đến nhà phát triển.");
      setSubject("");
      setContent("");
      onOpenChange(false);
    } catch (error) {
      console.error("Feedback error:", error);
      toast.error("Không thể gửi góp ý lúc này. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Gửi Góp Ý
          </DialogTitle>
          <DialogDescription>
            Chúng tôi luôn lắng nghe ý kiến của bạn để cải thiện trò chơi tốt hơn.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="subject">Chủ đề</Label>
            <Input
              id="subject"
              placeholder="VD: Lỗi giao diện, Gợi ý tính năng..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">Nội dung chi tiết</Label>
            <Textarea
              id="content"
              placeholder="Mô tả chi tiết góp ý của bạn tại đây..."
              className="min-h-[120px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              "Gửi Góp Ý"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
