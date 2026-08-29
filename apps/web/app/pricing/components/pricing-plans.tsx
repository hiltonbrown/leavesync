"use client";

import { isEarlyAccess } from "@repo/next-config/launch-mode";
import Link from "next/link";
import { supportHoursCompact } from "@/src/data/support";
import { signUpHref } from "@/src/lib/auth-links";
import { MARKETING_PLANS } from "../constants";

export const PricingPlans = () => {
  const earlyAccess = isEarlyAccess();

  if (earlyAccess) {
    return (
      <div className="fmkt-pricing-cards">
        <div className="fmkt-pricing-card fmkt-pricing-card--highlighted">
          <div className="fmkt-pricing-card__badge">Closed Early Access</div>
          <div className="fmkt-pricing-card__header">
            <h3 className="fmkt-pricing-card__title">AU Early Access</h3>
            <p className="fmkt-pricing-card__description">
              Closed early access for Australian businesses using Xero Payroll.
              Guided onboarding provided by the Team Calendar team.
            </p>
            <div className="fmkt-pricing-card__price-wrap">
              <span className="fmkt-pricing-card__price">Early Access</span>
            </div>
          </div>
          <ul className="fmkt-pricing-card__features">
            <li className="fmkt-pricing-card__feature">
              <span
                aria-hidden="true"
                className="fmkt-pricing-card__feature-icon"
              >
                ✓
              </span>
              1 Xero Payroll organisation (Australia)
            </li>
            <li className="fmkt-pricing-card__feature">
              <span
                aria-hidden="true"
                className="fmkt-pricing-card__feature-icon"
              >
                ✓
              </span>
              Unlimited secure calendar feeds
            </li>
            <li className="fmkt-pricing-card__feature">
              <span
                aria-hidden="true"
                className="fmkt-pricing-card__feature-icon"
              >
                ✓
              </span>
              Leave management & manual availability
            </li>
            <li className="fmkt-pricing-card__feature">
              <span
                aria-hidden="true"
                className="fmkt-pricing-card__feature-icon"
              >
                ✓
              </span>
              Guided onboarding & setup assistance
            </li>
            <li className="fmkt-pricing-card__feature">
              <span
                aria-hidden="true"
                className="fmkt-pricing-card__feature-icon"
              >
                ✓
              </span>
              Support during business hours ({supportHoursCompact})
            </li>
            <li className="fmkt-pricing-card__feature">
              <span
                aria-hidden="true"
                className="fmkt-pricing-card__feature-icon"
              >
                ✓
              </span>
              Pricing confirmed before any future paid billing
            </li>
          </ul>
          <div className="fmkt-pricing-card__footer">
            <Link
              className="marketing-btn marketing-btn--primary"
              href={signUpHref}
            >
              Get early access
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fmkt-pricing-cards">
      {MARKETING_PLANS.map((plan) => (
        <div
          className={`fmkt-pricing-card ${plan.highlighted ? "fmkt-pricing-card--highlighted" : ""}`}
          key={plan.name}
        >
          {plan.highlighted ? (
            <div className="fmkt-pricing-card__badge">Most Popular</div>
          ) : null}
          <div className="fmkt-pricing-card__header">
            <h3 className="fmkt-pricing-card__title">{plan.name}</h3>
            <p className="fmkt-pricing-card__description">{plan.description}</p>
            <div className="fmkt-pricing-card__price-wrap">
              <span className="fmkt-pricing-card__price">{plan.price}</span>
              {plan.interval ? (
                <span className="fmkt-pricing-card__interval">
                  /{plan.interval}
                </span>
              ) : null}
            </div>
          </div>
          <ul className="fmkt-pricing-card__features">
            {plan.features.map((feature) => (
              <li className="fmkt-pricing-card__feature" key={feature}>
                <span
                  aria-hidden="true"
                  className="fmkt-pricing-card__feature-icon"
                >
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <div className="fmkt-pricing-card__footer">
            <Link
              className={`marketing-btn ${plan.highlighted ? "marketing-btn--primary" : "marketing-btn--secondary"}`}
              href={plan.ctaHref}
            >
              {plan.ctaText}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};
