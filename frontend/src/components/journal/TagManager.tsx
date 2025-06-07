import { useState } from 'react';
import { Plus, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTradeTags } from '@/hooks/useTradeTags';
import { TradeTags } from '@/types/journal';
import type { CalculationError } from '@/types/api';

function isTagsArray(tags: TradeTags[] | CalculationError | undefined): tags is TradeTags[] {
  return Array.isArray(tags);
}

export function TagManager() {
  const { tags, isLoading, createTag, validateTag, refreshTags } = useTradeTags();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6'); // Default blue color
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Predefined colors for quick selection
  const predefinedColors = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#6b7280', // Gray
  ];

  const handleSubmit = async () => {
    // Validate tag data
    const validation = validateTag(newTagName, newTagColor);
    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    try {
      const result = await createTag.mutateAsync({
        name: newTagName,
        color: newTagColor,
      });

      if ('error' in result) {
        throw new Error(result.error);
      }

      // Reset form and close dialog
      setNewTagName('');
      setNewTagColor('#3b82f6');
      setIsDialogOpen(false);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Failed to create tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade Tags</CardTitle>
        <CardDescription>Manage tags to categorize your trades</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !isTagsArray(tags) ? (
          <div className="text-center py-8 text-destructive">
            <p>{'error' in (tags as CalculationError) ? (tags as CalculationError).error : 'Failed to load tags.'}</p>
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tags created yet. Create your first tag to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {tags.map((tag) => (
              <TagItem key={tag.id} tag={tag} />
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={refreshTags} disabled={isLoading}>
          Refresh
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
              <DialogDescription>
                Add a new tag to categorize your trades. Choose a name and color.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tag-name">Tag Name</Label>
                <Input
                  id="tag-name"
                  placeholder="e.g., Breakout, Swing Trade"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tag-color">Tag Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tag-color"
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTagColor(color)}
                      className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center"
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    >
                      {color === newTagColor && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {validationError && (
                <div className="text-sm text-destructive">{validationError}</div>
              )}
              <div className="flex items-center gap-2">
                <div
                  className="px-3 py-1 rounded-full text-sm"
                  style={{ backgroundColor: newTagColor + '33' }}
                >
                  {newTagName || 'Tag Preview'}
                </div>
                <span className="text-xs text-muted-foreground">
                  Preview
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Tag'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}

function TagItem({ tag }: { tag: TradeTags }) {
  const { deleteTag, isLoading } = useTradeTags();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-md"
      style={{ backgroundColor: tag.color + '15' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: tag.color }}
        />
        <span>{tag.name}</span>
      </div>
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
        </Button>
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Tag</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the tag "{tag.name}"?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await deleteTag.mutateAsync(tag.id);
                  setShowDeleteDialog(false);
                }}
                disabled={deleteTag.isLoading}
              >
                {deleteTag.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </div>
  );
}