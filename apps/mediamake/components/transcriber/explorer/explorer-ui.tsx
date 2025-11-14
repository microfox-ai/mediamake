"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Search,
    Filter,
    Calendar,
    Clock,
    FileAudio,
    Tag,
    Loader2,
    Copy,
    Files
} from "lucide-react";
import { useTranscriber } from "../contexts/transcriber-context";
import { Transcription } from "@/app/types/transcription";
import { toast } from "sonner";

// Pagination component
interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) {
        return null;
    }

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    const getPageNumbers = () => {
        const pageNumbers: (number | string)[] = [];
        const maxPagesToShow = 5;
        const halfPagesToShow = Math.floor(maxPagesToShow / 2);

        if (totalPages <= maxPagesToShow + 2) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            if (currentPage <= halfPagesToShow + 1) {
                for (let i = 1; i <= maxPagesToShow; i++) {
                    pageNumbers.push(i);
                }
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            } else if (currentPage >= totalPages - halfPagesToShow) {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = totalPages - maxPagesToShow + 1; i <= totalPages; i++) {
                    pageNumbers.push(i);
                }
            } else {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = currentPage - halfPagesToShow; i <= currentPage + halfPagesToShow; i++) {
                    pageNumbers.push(i);
                }
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            }
        }
        return pageNumbers;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="flex items-center justify-between mt-4 p-4 border-t">
            <span className="text-sm text-muted-foreground">
                Total results: {totalItems}
            </span>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentPage === 1}>
                    Previous
                </Button>
                {pageNumbers.map((page, index) =>
                    typeof page === 'number' ? (
                        <Button
                            key={index}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </Button>
                    ) : (
                        <span key={index} className="px-2 py-1 text-sm">
                            {page}
                        </span>
                    )
                )}
                <Button variant="outline" size="sm" onClick={handleNext} disabled={currentPage === totalPages}>
                    Next
                </Button>
            </div>
        </div>
    );
}

export function ExplorerUI() {
    const { setSelectedTranscription, setCurrentView } = useTranscriber();
    const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
    const [filteredTranscriptions, setFilteredTranscriptions] = useState<Transcription[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 10;

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch all available tags on mount
    useEffect(() => {
        fetchAllTags();
    }, []);

    // Fetch transcriptions when page or filters change
    useEffect(() => {
        fetchTranscriptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, selectedTags, debouncedSearchQuery]);

    // Reset to page 1 when filters change
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTags, debouncedSearchQuery]);

    const fetchAllTags = async () => {
        try {
            // Fetch all transcriptions to get all available tags
            const response = await fetch('/api/transcriptions?limit=1000&fields=tags');
            if (response.ok) {
                const data = await response.json();
                const tags = new Set<string>();
                data.transcriptions?.forEach((t: Transcription) => {
                    t.tags?.forEach(tag => tags.add(tag));
                });
                setAvailableTags(Array.from(tags));
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    };

    const fetchTranscriptions = async () => {
        try {
            setIsLoading(true);
            // Build query parameters
            const params = new URLSearchParams();
            params.append('page', currentPage.toString());
            params.append('limit', itemsPerPage.toString());
            if (selectedTags.length > 0) {
                params.append('tags', selectedTags.join(','));
            }
            if (debouncedSearchQuery) {
                params.append('search', debouncedSearchQuery);
            }
            
            const response = await fetch(`/api/transcriptions?${params}`);
            if (response.ok) {
                const data = await response.json();
                const results = data.transcriptions || [];
                setTranscriptions(results);
                setFilteredTranscriptions(results); // Set filtered to same as transcriptions (server-side filtering)
                setTotalCount(data.total || 0);
            }
        } catch (error) {
            console.error('Error fetching transcriptions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTranscriptionSelect = (transcription: Transcription) => {
        setSelectedTranscription(transcription._id?.toString() || '');
        setCurrentView('editor');
    };

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getDuration = (transcription: Transcription) => {
        if (transcription.captions && transcription.captions.length > 0) {
            const lastCaption = transcription.captions[transcription.captions.length - 1];
            return `${Math.round(lastCaption.absoluteEnd || 0)}s`;
        }
        return 'Unknown';
    };

    const copyAudioUrl = (e: React.MouseEvent, audioUrl: string | undefined) => {
        e.stopPropagation(); // Prevent card click
        
        if (!audioUrl) {
            toast.error('No audio URL available');
            return;
        }

        navigator.clipboard.writeText(audioUrl);
        toast.success('Audio URL copied to clipboard');
    };

    const duplicateTranscription = async (e: React.MouseEvent, transcriptionId: string) => {
        e.stopPropagation(); // Prevent card click
        
        try {
            toast.loading('Duplicating transcription...', { id: 'duplicate' });
            
            const response = await fetch(`/api/transcriptions/${transcriptionId}/duplicate`, {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                toast.success('Transcription duplicated successfully', { id: 'duplicate' });
                
                // Refresh the transcriptions list
                fetchTranscriptions();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to duplicate transcription', { id: 'duplicate' });
            }
        } catch (error) {
            console.error('Error duplicating transcription:', error);
            toast.error('Failed to duplicate transcription', { id: 'duplicate' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading transcriptions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search transcriptions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                    </Button>
                </div>

                {/* Tags Filter */}
                {availableTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {availableTags.map(tag => (
                            <Badge
                                key={tag}
                                variant={selectedTags.includes(tag) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => toggleTag(tag)}
                            >
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* Transcriptions Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4">
                    {filteredTranscriptions.length === 0 ? (
                        <div className="text-center py-12">
                            <FileAudio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-semibold mb-2">No transcriptions found</h3>
                            <p className="text-muted-foreground">
                                {searchQuery || selectedTags.length > 0
                                    ? "Try adjusting your search or filters"
                                    : "Start by creating your first transcription"
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredTranscriptions.map((transcription) => (
                                <div
                                    key={transcription._id?.toString()}
                                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => handleTranscriptionSelect(transcription)}
                                >
                                    {/* Title */}
                                    <div className="flex items-start gap-2 mb-2">
                                        <FileAudio className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        <h3 className="font-medium text-sm line-clamp-2 flex-1">
                                            {transcription.title || 'Untitled Transcription'}
                                        </h3>
                                        <Badge variant="outline" className="text-xs flex-shrink-0">
                                            {transcription.language || 'auto'}
                                        </Badge>
                                    </div>

                                    {/* Description */}
                                    {transcription.description && (
                                        <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                            {transcription.description}
                                        </div>
                                    )}

                                    {/* Keywords and Tags in one row */}
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {/* Keywords */}
                                        {transcription.keywords && transcription.keywords.length > 0 && (
                                            <>
                                                {transcription.keywords.slice(0, 2).map((keyword, index) => (
                                                    <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                                                        {keyword}
                                                    </Badge>
                                                ))}
                                                {transcription.keywords.length > 2 && (
                                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                                        +{transcription.keywords.length - 2}
                                                    </Badge>
                                                )}
                                            </>
                                        )}

                                        {/* Tags */}
                                        {transcription.tags && transcription.tags.length > 0 && (
                                            <>
                                                {transcription.tags.slice(0, 2).map((tag, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                                {transcription.tags.length > 2 && (
                                                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                                        +{transcription.tags.length - 2}
                                                    </Badge>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Metadata */}
                                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {getDuration(transcription)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(transcription.createdAt?.toString() || new Date().toISOString())}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => duplicateTranscription(e, transcription._id?.toString() || '')}
                                                className="h-6 px-2 text-xs"
                                                title="Duplicate transcription"
                                            >
                                                <Files className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => copyAudioUrl(e, transcription.audioUrl)}
                                                disabled={!transcription.audioUrl}
                                                className="h-6 px-2 text-xs"
                                                title="Copy audio URL"
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Pagination */}
                {totalCount > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalCount}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>
        </div>
    );
}
