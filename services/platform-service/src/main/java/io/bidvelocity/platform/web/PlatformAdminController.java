package io.bidvelocity.platform.web;

import io.bidvelocity.auction.domain.Auction;
import io.bidvelocity.auction.repo.AuctionRepository;
import io.bidvelocity.auth.domain.User;
import io.bidvelocity.auth.repo.UserRepository;
import io.bidvelocity.bidding.domain.Bid;
import io.bidvelocity.bidding.repo.BidRepository;
import io.bidvelocity.payment.domain.Payment;
import io.bidvelocity.payment.repo.PaymentRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('ADMIN')")
public class PlatformAdminController {

    private final UserRepository users;
    private final AuctionRepository auctions;
    private final BidRepository bids;
    private final PaymentRepository payments;

    public PlatformAdminController(UserRepository users, AuctionRepository auctions,
                                   BidRepository bids, PaymentRepository payments) {
        this.users = users;
        this.auctions = auctions;
        this.bids = bids;
        this.payments = payments;
    }

    public record AdminStats(
            long totalUsers,
            long activeUsers,
            long suspendedUsers,
            long sellerCount,
            long adminCount,
            long totalAuctions,
            long liveAuctions,
            long closedAuctions,
            long cancelledAuctions,
            long totalBids,
            BigDecimal totalGmv,
            long totalPayments,
            BigDecimal settledPaymentsAmount
    ) {}

    public record AdminBidDto(
            Long id,
            Long auctionId,
            String auctionTitle,
            Long bidderId,
            String bidderName,
            BigDecimal amount,
            String status,
            String rejectReason,
            Instant acceptedAt
    ) {}

    @GetMapping("/stats")
    public AdminStats stats() {
        List<User> allUsers = users.findAll();
        long totalUsers = allUsers.size();
        long activeUsers = allUsers.stream().filter(u -> "ACTIVE".equals(u.getStatus())).count();
        long suspendedUsers = allUsers.stream().filter(u -> "SUSPENDED".equals(u.getStatus())).count();
        long sellerCount = allUsers.stream().filter(u -> u.getRoles().stream().anyMatch(r -> "SELLER".equals(r.getName()))).count();
        long adminCount = allUsers.stream().filter(u -> u.getRoles().stream().anyMatch(r -> "ADMIN".equals(r.getName()))).count();

        List<Auction> allAuctions = auctions.findAll();
        long totalAuctions = allAuctions.size();
        long liveAuctions = allAuctions.stream().filter(a -> a.getStatus() == Auction.Status.LIVE || a.getStatus() == Auction.Status.ENDING).count();
        long closedAuctions = allAuctions.stream().filter(a -> a.getStatus() == Auction.Status.SOLD || a.getStatus() == Auction.Status.ENDED || a.getStatus() == Auction.Status.UNSOLD).count();
        long cancelledAuctions = allAuctions.stream().filter(a -> a.getStatus() == Auction.Status.CANCELLED).count();

        long totalBids = bids.count();

        BigDecimal totalGmv = allAuctions.stream()
                .filter(a -> a.getStatus() == Auction.Status.SOLD && a.getWinningAmount() != null)
                .map(Auction::getWinningAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalGmv.compareTo(BigDecimal.ZERO) == 0) {
            totalGmv = allAuctions.stream()
                    .filter(a -> a.getCurrentPrice() != null)
                    .map(Auction::getCurrentPrice)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        List<Payment> allPayments = payments.findAll();
        long totalPayments = allPayments.size();
        BigDecimal settledPaymentsAmount = allPayments.stream()
                .filter(p -> p.getStatus() == Payment.Status.SUCCESS && p.getAmount() != null)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new AdminStats(totalUsers, activeUsers, suspendedUsers, sellerCount, adminCount,
                totalAuctions, liveAuctions, closedAuctions, cancelledAuctions,
                totalBids, totalGmv, totalPayments, settledPaymentsAmount);
    }

    @GetMapping("/bids")
    public List<AdminBidDto> recentBids(@RequestParam(defaultValue = "50") int size) {
        int limit = Math.min(100, Math.max(1, size));
        List<Bid> recentBids = bids.findAll(PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "id"))).getContent();
        Map<Long, String> titles = auctions.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(Auction::getId, Auction::getTitle, (a, b) -> a));

        return recentBids.stream().map(b -> new AdminBidDto(
                b.getId(),
                b.getAuctionId(),
                titles.getOrDefault(b.getAuctionId(), "Auction #" + b.getAuctionId()),
                b.getBidderId(),
                b.getBidderName(),
                b.getAmount(),
                b.getStatus(),
                b.getRejectReason(),
                b.getAcceptedAt()
        )).toList();
    }
}
