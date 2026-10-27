"use client";

import * as React from "react";
import type { Settlement } from "@tce/shared";
import { ArrowUpRight, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { getSettlements, type SettlementsSummary } from "@/lib/api";
import { formatAddisDate, formatETB } from "@/lib/utils";

export default function SettlementsPage() {
  const [data, setData] = React.useState<SettlementsSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const fetchSettlements = React.useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true);
      const summary = await getSettlements();
      setData(summary);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load settlements",
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchSettlements();
  }, [fetchSettlements]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Payout Settlements / ክፍያዎች
          </h1>
          <p className="text-sm text-muted-foreground">
            BirrJS automated merchant payouts ledger (Telebirr & CBE Birr).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchSettlements(true)}
          disabled={isRefreshing}
          className="gap-2 self-start"
        >
          <RefreshCw
            className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span>Refresh Ledger / አድስ</span>
        </Button>
      </div>

      {/* Summary Cards */}
      {loading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`stat-${i}`} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Paid Out / የተከፈለ
              </CardTitle>
              <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatETB(data.totalPaidOut)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Settled directly to your Telebirr / CBE merchant account
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Settlement / በመጠባበቅ ላይ
              </CardTitle>
              <div className="flex size-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
                <Clock className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatETB(data.pendingPayout)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Next automated payout run at 00:00 EAT
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                This Week / የዚህ ሳምንት
              </CardTitle>
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ArrowUpRight className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatETB(data.thisWeekPayout)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last 7 calendar days
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settlements Table */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Transaction Ledger
          </CardTitle>
          <CardDescription className="text-xs">
            Individual checkout receipts verified through BirrJS webhooks.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading || !data ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`row-${i}`} className="h-10 w-full" />
              ))}
            </div>
          ) : data.settlements.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No settlement transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Order #</TableHead>
                    <TableHead>Payment Gateway</TableHead>
                    <TableHead>Payout Destination</TableHead>
                    <TableHead>Date & Time (EAT)</TableHead>
                    <TableHead className="text-right">Amount (ETB)</TableHead>
                    <TableHead className="w-28 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.settlements.map((s) => (
                    <TableRow
                      key={s.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="font-semibold font-mono text-xs text-foreground">
                        #{s.orderNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-medium text-xs border-border bg-muted/40"
                        >
                          {s.provider}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {s.payoutAccount}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatAddisDate(s.date)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-foreground font-mono">
                        {formatETB(s.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {s.status === "paid" ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium text-[11px]">
                            Settled
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-medium text-[11px]">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
