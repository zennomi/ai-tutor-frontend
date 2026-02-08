import Image from "next/image";
import type { Attachment } from "@/lib/types";
import { Loader } from "./elements/loader";
import { CrossSmallIcon } from "./icons";
import { Button } from "./ui/button";

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
  onPreview,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
  onPreview?: (attachment: Attachment) => void;
}) => {
  const { name, url, contentType } = attachment;

  const handlePreview = () => {
    if (onPreview && !isUploading) {
      onPreview(attachment);
    }
  };

  const content = (
    <>
      {contentType?.startsWith("image") ? (
        <Image
          alt={name ?? "An image attachment"}
          className="size-full object-cover"
          height={64}
          src={url}
          width={64}
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground text-xs">
          File
        </div>
      )}

      {isUploading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50"
          data-testid="input-attachment-loader"
        >
          <Loader size={16} />
        </div>
      )}

      {onRemove && !isUploading && (
        <Button
          className="absolute top-0.5 right-0.5 size-4 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          size="sm"
          variant="destructive"
        >
          <CrossSmallIcon size={8} />
        </Button>
      )}

      <div className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/80 to-transparent px-1 py-0.5 text-[10px] text-white">
        {name}
      </div>
    </>
  );

  const className = `group relative size-16 overflow-hidden rounded-lg border bg-muted ${
    onPreview ? "cursor-pointer transition-transform hover:scale-105" : ""
  }`;

  if (onPreview) {
    return (
      <button
        className={className}
        data-testid="input-attachment-preview"
        onClick={handlePreview}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handlePreview();
          }
        }}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className} data-testid="input-attachment-preview">
      {content}
    </div>
  );
};
