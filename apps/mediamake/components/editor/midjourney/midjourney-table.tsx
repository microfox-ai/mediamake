"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Clock,
    CheckCircle,
    Tag,
    Loader2,
    FileText,
    Search,
    X,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { MidjourneyPromptRecord } from "@/app/ai/agents/midjourney/helpers";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MidjourneyTableProps {
    selectedRecord: string | null;
    onSelectRecord: (recordId: string, recordData?: MidjourneyPromptRecord) => void;
}

interface MidjourneyListResponse {
    records: MidjourneyPromptRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export function MidjourneyTable({ selectedRecord, onSelectRecord }: MidjourneyTableProps) {
    const [records, setRecords] = useState<MidjourneyPromptRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageInput, setPageInput] = useState("");
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [customTagInput, setCustomTagInput] = useState("");
    const limit = 20;

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch available tags
    useEffect(() => {
        const fetchAvailableTags = async () => {
            try {
                const response = await fetch(`/api/midjourney-prompts?limit=1000`);
                if (response.ok) {
                    const data: MidjourneyListResponse = await response.json();
                    const tagsSet = new Set<string>();
                    data.records.forEach((record) => {
                        record.tags?.forEach((tag) => tagsSet.add(tag));
                    });
                    setAvailableTags(Array.from(tagsSet).sort());
                }
            } catch (error) {
                console.error('Error fetching available tags:', error);
            }
        };
        fetchAvailableTags();
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => {
        if (page !== 1) {
            setPage(1);
        }
    }, [selectedTags, debouncedSearchQuery]);

    // Fetch records from API
    const fetchRecords = async (pageNum: number) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', pageNum.toString());
            params.append('limit', limit.toString());
            params.append('sortBy', 'createdAt');
            params.append('sortOrder', 'desc');
            if (debouncedSearchQuery) {
                params.append('search', debouncedSearchQuery);
            }
            if (selectedTags.length > 0) {
                params.append('tags', selectedTags.join(','));
            }

            const response = await fetch(`/api/midjourney-prompts?${params}`);
            if (response.ok) {
                const data: MidjourneyListResponse = await response.json();
                setRecords(data.records);
                setTotalPages(data.totalPages);
                setTotal(data.total);
            } else {
                console.error('Failed to fetch midjourney prompts');
            }
        } catch (error) {
            console.error('Error fetching midjourney prompts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords(page);
    }, [page, selectedTags, debouncedSearchQuery]);

    const formatDate = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const addCustomTag = () => {
        const tag = customTagInput.trim();
        if (tag && !selectedTags.includes(tag)) {
            setSelectedTags(prev => [...prev, tag]);
            setCustomTagInput("");
        }
    };

    const removeTag = (tag: string) => {
        setSelectedTags(prev => prev.filter(t => t !== tag));
    };

    const handleCustomTagKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCustomTag();
        }
    };

    const handlePageInputKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const pageNum = parseInt(pageInput);
            if (pageNum >= 1 && pageNum <= totalPages) {
                setPage(pageNum);
                setPageInput("");
            }
        }
    };

    const handlePageInputChange = (value: string) => {
        const num = parseInt(value);
        if (value === "" || (!isNaN(num) && num >= 1 && num <= totalPages)) {
            setPageInput(value);
        }
    };

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedTags([]);
        setCustomTagInput("");
    };

    const hasActiveFilters = searchQuery || selectedTags.length > 0;

    return (
        <Card className="w-full">
            <div className="p-4 border-b space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Midjourney Prompts</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {total} total records
                        </p>
                    </div>
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="text-muted-foreground"
                        >
                            <X className="h-4 w-4 mr-1" />
                            Clear filters
                        </Button>
                    )}
                </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Custom Tag Input */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Add custom tag (press Enter)"
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        onKeyPress={handleCustomTagKeyPress}
                        className="flex-1"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={addCustomTag}
                        disabled={!customTagInput.trim()}
                    >
                        Add Tag
                    </Button>
                </div>

                {/* Selected Tags */}
                {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {selectedTags.map(tag => (
                            <Badge
                                key={tag}
                                variant="default"
                                className="cursor-pointer"
                                onClick={() => removeTag(tag)}
                            >
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                                <X className="h-3 w-3 ml-1" />
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Available Tags (from existing records) */}
                {availableTags.length > 0 && (
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">Available tags:</p>
                        <div className="flex flex-wrap gap-2">
                            {availableTags
                                .filter(tag => !selectedTags.includes(tag))
                                .map(tag => (
                                    <Badge
                                        key={tag}
                                        variant="outline"
                                        className="cursor-pointer"
                                        onClick={() => toggleTag(tag)}
                                    >
                                        <Tag className="h-3 w-3 mr-1" />
                                        {tag}
                                    </Badge>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : records.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                        {hasActiveFilters
                            ? "No records found matching your filters"
                            : "No records found"}
                    </p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Status</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Tags</TableHead>
                                    <TableHead>Progress</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Updated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.map((record) => (
                                    <TableRow
                                        key={record._id?.toString()}
                                        className={cn(
                                            "cursor-pointer",
                                            selectedRecord === record._id?.toString() && "bg-muted"
                                        )}
                                        onClick={() => onSelectRecord(record._id?.toString() || '', record)}
                                    >
                                        <TableCell>
                                            {record.isGenerated ? (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Clock className="h-4 w-4 text-yellow-500" />
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {record.title || 'Untitled'}
                                        </TableCell>
                                        <TableCell>
                                            {record.tags && record.tags.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {record.tags.slice(0, 3).map((tag, idx) => (
                                                        <Badge key={idx} variant="secondary" className="text-xs">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                    {record.tags.length > 3 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            +{record.tags.length - 3}
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {record.isGenerated ? (
                                                <Badge variant="default" className="text-xs">
                                                    Complete
                                                </Badge>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">{record.generationProgress}%</span>
                                                    {record.generatedIndexes && (
                                                        <span className="text-xs text-muted-foreground">
                                                            ({record.generatedIndexes.length} generated)
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(record.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(record.updatedAt)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <div className="p-4 border-t">
                            <div className="flex items-center justify-between">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                className={cn(
                                                    "cursor-pointer",
                                                    page === 1 && "pointer-events-none opacity-50"
                                                )}
                                            />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <span className="text-sm text-muted-foreground px-2">
                                                Page {page} of {totalPages}
                                            </span>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                className={cn(
                                                    "cursor-pointer",
                                                    page === totalPages && "pointer-events-none opacity-50"
                                                )}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Go to page:</span>
                                    <Input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={pageInput}
                                        onChange={(e) => handlePageInputChange(e.target.value)}
                                        onKeyPress={handlePageInputKeyPress}
                                        placeholder={page.toString()}
                                        className="w-20"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const pageNum = parseInt(pageInput);
                                            if (pageNum >= 1 && pageNum <= totalPages) {
                                                setPage(pageNum);
                                                setPageInput("");
                                            }
                                        }}
                                        disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > totalPages}
                                    >
                                        Go
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}
