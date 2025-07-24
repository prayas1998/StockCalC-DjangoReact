"use client"

import { useState } from "react"
import { Plus, Check, Loader2, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTradeTags } from "@/hooks/useTradeTags"
import type { TradeTags } from "@/types/journal"
import { isTagsArray } from "./utils"
import { PREDEFINED_TAG_COLORS } from "./constants"
import type { CalculationError } from "@/types/api"

export function TagManager() {
  const { tags, isLoading, createTag, updateTag, validateTag, refreshTags } = useTradeTags()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TradeTags | null>(null)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#3b82f6") // Default blue color
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async () => {
    // Validate tag data
    const validation = validateTag(newTagName, newTagColor)
    if (!validation.valid) {
      setValidationError(validation.error || null)
      return
    }

    setValidationError(null)
    setIsSubmitting(true)

    try {
      if (editingTag) {
        // Update existing tag
        const result = await updateTag.mutateAsync({
          id: editingTag.id,
          tag: {
            name: newTagName,
            color: newTagColor,
          },
        })

        if ("error" in result) {
          throw new Error(result.error)
        }
      } else {
        // Create new tag
        const result = await createTag.mutateAsync({
          name: newTagName,
          color: newTagColor,
        })

        if ("error" in result) {
          throw new Error(result.error)
        }
      }

      // Reset form and close dialog
      handleCloseDialog()
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : `Failed to ${editingTag ? "update" : "create"} tag`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseDialog = () => {
    setNewTagName("")
    setNewTagColor("#3b82f6")
    setEditingTag(null)
    setValidationError(null)
    setIsDialogOpen(false)
  }

  const handleEditTag = (tag: TradeTags) => {
    setEditingTag(tag)
    setNewTagName(tag.name)
    setNewTagColor(tag.color)
    setIsDialogOpen(true)
  }

  return (
    <Card className="border bg-card text-card-foreground shadow-sm">
      <CardHeader className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">Trade Tags</CardTitle>
            <CardDescription className="text-sm">Manage tags to categorize your trades</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="mr-1 h-3.5 w-3.5" /> New Tag
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTag ? "Edit Tag" : "Create New Tag"}</DialogTitle>
                <DialogDescription>
                  {editingTag ? "Update the tag details." : "Add a new tag to categorize your trades."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-3">
                <div>
                  <Label htmlFor="tag-name" className="text-sm font-medium">
                    Tag Name
                  </Label>
                  <Input
                    id="tag-name"
                    placeholder="e.g., Breakout, Swing Trade"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="tag-color" className="text-sm font-medium">
                    Tag Color
                  </Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Input
                      id="tag-color"
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-10 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {PREDEFINED_TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTagColor(color)}
                        className="w-6 h-6 rounded-full border flex items-center justify-center"
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      >
                        {color === newTagColor && <Check className="h-3 w-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {validationError && <div className="text-sm text-destructive">{validationError}</div>}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleCloseDialog} size="sm">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} size="sm">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      {editingTag ? "Updating..." : "Creating..."}
                    </>
                  ) : editingTag ? (
                    "Update Tag"
                  ) : (
                    "Create Tag"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="px-6 py-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !isTagsArray(tags) ? (
          <div className="py-4 text-destructive text-sm">
            <p>{"error" in (tags as CalculationError) ? (tags as CalculationError).error : "Failed to load tags."}</p>
          </div>
        ) : tags.length === 0 ? (
          <div className="py-4 text-muted-foreground text-sm">
            <p>No tags created yet. Create your first tag to get started.</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left text-xs font-medium text-muted-foreground p-2 pl-3">Color</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-2">Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-2">Preview</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-2 pl-3">
                      <div
                        className="w-4 h-4 rounded-full border border-border/50"
                        style={{ backgroundColor: tag.color }}
                      />
                    </td>
                    <td className="p-2 font-medium">{tag.name}</td>
                    <td className="p-2">
                      <div
                        className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: tag.color + "20",
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </div>
                    </td>
                    <td className="p-2 pr-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditTag(tag)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <DeleteTagButton tag={tag} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <CardFooter className="px-6 py-4 flex justify-between border-t">
        <div className="text-xs text-muted-foreground">
          {isTagsArray(tags) ? `${tags.length} ${tags.length === 1 ? "tag" : "tags"}` : ""}
        </div>
        <Button variant="outline" size="sm" onClick={refreshTags} disabled={isLoading} className="h-8 bg-transparent">
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
        </Button>
      </CardFooter>
    </Card>
  )
}

function DeleteTagButton({ tag }: { tag: TradeTags }) {
  const { deleteTag } = useTradeTags()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
        onClick={() => setShowDeleteDialog(true)}
        disabled={deleteTag.isPending}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the tag <strong>"{tag.name}"</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} size="sm">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await deleteTag.mutateAsync(tag.id)
                setShowDeleteDialog(false)
              }}
              disabled={deleteTag.isPending}
              size="sm"
            >
              {deleteTag.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
