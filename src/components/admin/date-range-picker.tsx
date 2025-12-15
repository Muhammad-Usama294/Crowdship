"use client"

import { useState } from "react"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateRangePickerProps {
    onRangeChange: (startDate: Date, endDate: Date) => void
}

export function DateRangePicker({ onRangeChange }: DateRangePickerProps) {
    const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()))
    const [endDate, setEndDate] = useState<Date>(endOfDay(new Date()))

    const applyQuickFilter = (days: number) => {
        const end = endOfDay(new Date())
        const start = startOfDay(subDays(end, days))
        setStartDate(start)
        setEndDate(end)
        onRangeChange(start, end)
    }

    const applyCustomRange = () => {
        onRangeChange(startDate, endDate)
    }

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Quick Filters */}
            <div className="flex gap-2 flex-wrap">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickFilter(0)}
                >
                    Today
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickFilter(6)}
                >
                    Last 7 Days
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickFilter(29)}
                >
                    Last 30 Days
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyQuickFilter(179)}
                >
                    Last 6 Months
                </Button>
            </div>

            {/* Custom Range */}
            <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">Custom:</span>

                {/* Start Date Picker */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "w-[140px] justify-start text-left font-normal",
                                !startDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "MMM dd, yyyy") : "Start date"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => date && setStartDate(startOfDay(date))}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                <span className="text-muted-foreground">to</span>

                {/* End Date Picker */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "w-[140px] justify-start text-left font-normal",
                                !endDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "MMM dd, yyyy") : "End date"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => date && setEndDate(endOfDay(date))}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                <Button onClick={applyCustomRange} size="sm">
                    Apply
                </Button>
            </div>
        </div>
    )
}
