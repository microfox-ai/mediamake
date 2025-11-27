'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Github,
  FolderOpen,
  Info,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CreatedIssue {
  number: number;
  url: string;
  title: string;
  promptCount: number;
}

interface PreviewResult {
  filesFound: string[];
  totalPrompts: number;
  estimatedBatches: number;
  titles: string[];
}

export default function PresetBatchCreatorPage() {
  const [githubOwner, setGithubOwner] = useState('microfox-ai');
  const [githubRepo, setGithubRepo] = useState('mediamake');
  const [folderPath, setFolderPath] = useState('scripts/output');
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    totalFiles?: number;
    totalPrompts?: number;
    batchesCreated?: number;
    issues?: CreatedIssue[];
    error?: string;
  } | null>(null);

  const handlePreview = async () => {
    setPreviewing(true);
    setPreview(null);

    try {
      const response = await fetch('/api/admin/create-preset-issues/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
        },
        body: JSON.stringify({
          folderPath: folderPath || 'scripts/output',
        }),
      });

      const data = await response.json();

      if (data.error) {
        setResult({ success: false, error: data.error });
      } else {
        setPreview(data);
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Failed to preview folder',
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/create-preset-issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
        },
        body: JSON.stringify({
          githubOwner,
          githubRepo,
          folderPath: folderPath || 'scripts/output',
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Failed to create issues',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Github className="w-6 h-6" />
            <CardTitle>Batch Preset Issue Creator</CardTitle>
          </div>
          <CardDescription>
            Automatically create GitHub issues from JSON output files. Combines
            up to 50 prompts per issue and triggers the preset generation
            workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Issues</TabsTrigger>
              <TabsTrigger value="preview">Preview Folder</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6 mt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="folder"
                      className="flex items-center gap-2"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Output Folder Path
                    </Label>
                    <Input
                      id="folder"
                      placeholder="e.g., scripts/output or apps/mediamake/scripts/output"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Relative to project root. Leave as default or specify
                      custom path.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="owner">GitHub Owner</Label>
                      <Input
                        id="owner"
                        placeholder="e.g., your-username"
                        value={githubOwner}
                        onChange={(e) => setGithubOwner(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="repo">GitHub Repository</Label>
                      <Input
                        id="repo"
                        placeholder="e.g., mediamake"
                        value={githubRepo}
                        onChange={(e) => setGithubRepo(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    This will scan for{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      data_run_*.json
                    </code>{' '}
                    files in the specified folder and create GitHub issues with
                    the &quot;New Presets&quot; prefix.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreview}
                    disabled={previewing}
                    className="flex-1"
                  >
                    {previewing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Preview Folder
                      </>
                    )}
                  </Button>

                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Issues...
                      </>
                    ) : (
                      <>
                        <Github className="mr-2 h-4 w-4" />
                        Create Issues
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {preview && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-blue-900">
                      Preview Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-900">
                          {preview.filesFound.length}
                        </div>
                        <div className="text-xs text-blue-700">
                          Files Found
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-900">
                          {preview.totalPrompts}
                        </div>
                        <div className="text-xs text-blue-700">
                          Total Prompts
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-900">
                          {preview.estimatedBatches}
                        </div>
                        <div className="text-xs text-blue-700">
                          Issues to Create
                        </div>
                      </div>
                    </div>

                    {preview.filesFound.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-blue-900">
                          Files:
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {preview.filesFound.map((file, idx) => (
                            <div
                              key={idx}
                              className="text-xs font-mono bg-white/50 px-2 py-1 rounded"
                            >
                              {file}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {preview.titles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-blue-900">
                          Preview Titles:
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {preview.titles.slice(0, 5).map((title, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-white/50 px-2 py-1 rounded"
                            >
                              • {title}
                            </div>
                          ))}
                          {preview.titles.length > 5 && (
                            <div className="text-xs text-blue-700 px-2">
                              ... and {preview.titles.length - 5} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label
                  htmlFor="preview-folder"
                  className="flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  Folder Path to Preview
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="preview-folder"
                    placeholder="e.g., scripts/output"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button onClick={handlePreview} disabled={previewing}>
                    {previewing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Scan'
                    )}
                  </Button>
                </div>
              </div>

              {preview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Scan Results</CardTitle>
                    <CardDescription>
                      Found {preview.filesFound.length} file(s) with{' '}
                      {preview.totalPrompts} prompts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label className="text-sm font-semibold">
                        JSON Files:
                      </Label>
                      <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-3 bg-muted/30">
                        {preview.filesFound.map((file, idx) => (
                          <div key={idx} className="text-sm font-mono">
                            {file}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-sm font-semibold">
                        Extracted Titles:
                      </Label>
                      <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-3 bg-muted/30">
                        {preview.titles.map((title, idx) => (
                          <div key={idx} className="text-sm">
                            {idx + 1}. {title}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        These prompts will be split into{' '}
                        {preview.estimatedBatches} GitHub issue(s) with up to
                        50 prompts each.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {result && (
            <div className="mt-6 space-y-4">
              {result.success ? (
                <>
                  <Alert className="border-green-500 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Successfully created {result.batchesCreated} issue(s) from{' '}
                      {result.totalFiles} file(s) containing{' '}
                      {result.totalPrompts} prompts!
                    </AlertDescription>
                  </Alert>

                  {result.issues && result.issues.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Created Issues:</h3>
                      <div className="space-y-2">
                        {result.issues.map((issue) => (
                          <Card key={issue.number} className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono text-muted-foreground">
                                    #{issue.number}
                                  </span>
                                  <span className="text-sm font-medium">
                                    {issue.title}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {issue.promptCount} prompts
                                </p>
                              </div>
                              <Button size="sm" variant="outline" asChild>
                                <a
                                  href={issue.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2"
                                >
                                  <Github className="w-4 h-4" />
                                  View
                                </a>
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {result.error || 'An error occurred'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

