import { Card, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { FileText } from"lucide-react";
import { cn } from"@/lib/cn";

export type EssayPrompt = {
 id: string;
 schoolName: string;
 promptText: string;
 wordLimit: number | null;
 required: boolean;
};

type PromptCardProps = {
 prompt: EssayPrompt;
 selected?: boolean;
 onSelect?: (prompt: EssayPrompt) => void;
};

export function PromptCard({ prompt, selected, onSelect }: PromptCardProps) {
 return (
 <Card
 size="sm"
 className={cn(
"cursor-pointer transition-all",
 selected &&"ring-2 ring-primary"
 )}
 onClick={() => onSelect?.(prompt)}
 >
 <CardHeader>
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <FileText className="size-4 text-muted-foreground"/>
 <CardTitle className="text-sm font-medium">
 {prompt.schoolName}
 </CardTitle>
 </div>
 <div className="flex items-center gap-1.5">
 {prompt.wordLimit && (
 <Badge variant="outline" className="text-xs">
 {prompt.wordLimit} words
 </Badge>
 )}
 <Badge variant={prompt.required ?"default":"secondary"}>
 {prompt.required ?"Required":"Optional"}
 </Badge>
 </div>
 </div>
 <CardDescription className="mt-1 line-clamp-2 text-xs">
 {prompt.promptText}
 </CardDescription>
 </CardHeader>
 </Card>
 );
}
