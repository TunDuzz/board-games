import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";

const XiangqiGame = () => {
  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <h1 className="text-4xl font-bold tracking-tight text-primary">Xiangqi</h1>
          <p className="text-muted-foreground">This feature is currently under development.</p>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default XiangqiGame;
