'use client';

import { CopyIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type VersionSelectorProps = {
  versions: string[];
  currentVersion: string | undefined;
  onVersionChange: (version: string) => void;
  disabled?: boolean;
};

export function VersionSelector({
  versions,
  currentVersion,
  onVersionChange,
  disabled,
}: VersionSelectorProps) {
  const hasVersions = versions.length > 0;
  const latestCommitSha = hasVersions
    ? versions[versions.length - 1]
    : undefined;
  const orderedVersions = hasVersions ? [...versions].reverse() : [];
  const isLatestCommit =
    !!currentVersion &&
    !!latestCommitSha &&
    currentVersion === latestCommitSha;
  const truncatedCommitSha = currentVersion
    ? currentVersion.slice(0, 7)
    : '';

  if (!hasVersions && !currentVersion) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={currentVersion}
        onValueChange={onVersionChange}
        disabled={disabled || !hasVersions}
      >
        <SelectTrigger
          className="h-9 min-w-[150px] px-3 py-1.5"
          title={
            currentVersion
              ? isLatestCommit
                ? `Latest (${currentVersion})`
                : currentVersion
              : undefined
          }
        >
          {currentVersion ? (
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground">
                {isLatestCommit ? 'Latest' : truncatedCommitSha}
              </span>
              {isLatestCommit && (
                <span className="font-mono text-xs text-muted-foreground/80">
                  {truncatedCommitSha}
                </span>
              )}
            </div>
          ) : (
            <SelectValue
              placeholder={hasVersions ? 'Select version' : 'No versions'}
            />
          )}
        </SelectTrigger>
        {hasVersions && (
          <SelectContent>
            {orderedVersions.map((v) => {
              const isLatestOption = latestCommitSha === v;
              const shortHash = v.slice(0, 7);
              return (
                <SelectItem key={v} value={v}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {isLatestOption ? 'Latest' : shortHash}
                    </span>
                    {isLatestOption && (
                      <span className="font-mono text-xs text-muted-foreground/80">
                        {shortHash}
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        )}
      </Select>
      {currentVersion && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          title={`Copy full SHA: ${currentVersion}`}
          aria-label="Copy commit SHA"
          onClick={() => navigator.clipboard.writeText(currentVersion)}
          className="h-6 w-6 text-muted-foreground"
        >
          <CopyIcon size={12} />
        </Button>
      )}
    </div>
  );
}
