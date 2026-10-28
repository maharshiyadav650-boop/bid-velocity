package io.bidvelocity.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.FullyQualifiedAnnotationBeanNameGenerator;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableDiscoveryClient
@EnableFeignClients(basePackages = "io.bidvelocity")
@EnableScheduling
@ComponentScan(
    basePackages = {
        "io.bidvelocity.platform",
        "io.bidvelocity.auth",
        "io.bidvelocity.auction",
        "io.bidvelocity.bidding",
        "io.bidvelocity.payment"
    },
    nameGenerator = FullyQualifiedAnnotationBeanNameGenerator.class,
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.REGEX,
        pattern = "io\\.bidvelocity\\.(auth\\.AuthApplication|auction\\.AuctionApplication|bidding\\.BiddingApplication|payment\\.PaymentApplication)"
    )
)
@EntityScan(basePackages = {
    "io.bidvelocity.auth.domain",
    "io.bidvelocity.auction.domain",
    "io.bidvelocity.bidding.domain",
    "io.bidvelocity.payment.domain"
})
@EnableJpaRepositories(basePackages = {
    "io.bidvelocity.auth.repo",
    "io.bidvelocity.auction.repo",
    "io.bidvelocity.bidding.repo",
    "io.bidvelocity.payment.repo"
})
public class PlatformApplication {
    public static void main(String[] args) {
        SpringApplication.run(PlatformApplication.class, args);
    }
}
