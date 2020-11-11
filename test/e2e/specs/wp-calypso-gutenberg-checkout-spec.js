/**
 * External dependencies
 */
import { By } from 'selenium-webdriver';
import config from 'config';
import assert from 'assert';

/**
 * Internal dependencies
 */
import LoginFlow from '../lib/flows/login-flow.js';
import GutenbergEditorComponent from '../lib/gutenberg/gutenberg-editor-component';
import SecurePaymentComponent from '../lib/components/secure-payment-component.js';
import UpsellPage from '../lib/pages/signup/upsell-page';
import DeletePlanFlow from '../lib/flows/delete-plan-flow';

import * as driverManager from '../lib/driver-manager';
import * as driverHelper from '../lib/driver-helper';
import * as dataHelper from '../lib/data-helper';

const mochaTimeOut = config.get( 'mochaTimeoutMS' );
const startBrowserTimeoutMS = config.get( 'startBrowserTimeoutMS' );
const screenSize = driverManager.currentScreenSize();
const host = dataHelper.getJetpackHost();

let driver;

before( async function () {
	this.timeout( startBrowserTimeoutMS );
	driver = await driverManager.startBrowser();
} );

describe( `[${ host }] Calypso Gutenberg Editor: Checkout on (${ screenSize }) is interactive @parallel`, function () {
	this.timeout( mochaTimeOut );
	let editorUrl;

	describe( 'Can trigger the checkout modal via post editor', function () {
		step( 'Can log in', async function () {
			this.timeout( mochaTimeOut * 12 );
			const loginFlow = new LoginFlow( driver, 'gutenbergSimpleSiteFreePlanUser', {
				useSandboxForPayments: true,
			} );
			return await loginFlow.loginAndStartNewPost( null, true );
		} );

		step( 'Can insert the premium block', async function () {
			const gEditorComponent = await GutenbergEditorComponent.Expect( driver );
			await gEditorComponent.addBlock( 'Simple Payments' );
			return await driverHelper.waitTillPresentAndDisplayed(
				driver,
				By.css( '.wp-block-jetpack-simple-payments' )
			);
		} );

		step( 'Can click Upgrade button on premium block', async function () {
			const gEditorComponent = await GutenbergEditorComponent.Expect( driver );
			await gEditorComponent.clickUpgradeOnPremiumBlock();
			return await driver.switchTo().defaultContent();
		} );

		step( 'Can view checkout modal', async function () {
			editorUrl = await driver.executeScript( 'return window.location.href' );
			await driverHelper.waitTillPresentAndDisplayed( driver, By.css( '.editor-checkout-modal' ) );
			const compositeCheckoutIsPresent = await driverHelper.isElementPresent(
				driver,
				By.css( '.editor-checkout-modal' )
			);
			assert.strictEqual(
				compositeCheckoutIsPresent,
				true,
				'The in-editor checkout is not present'
			);
		} );
	} );

	describe( 'Has correct plan details', function () {
		step( 'Contains Premium Plan', async function () {
			const securePaymentComponent = await SecurePaymentComponent.Expect( driver );
			const checkoutContainsPremiumPlan = await securePaymentComponent.containsPremiumPlan();
			assert.strictEqual(
				checkoutContainsPremiumPlan,
				true,
				'The in-editor checkout does not contain the expected Premium Plan'
			);
		} );

		step( 'Can change plan length', async function () {
			const securePaymentComponent = await SecurePaymentComponent.Expect( driver );
			const originalCartAmount = await securePaymentComponent.cartTotalAmount();
			await driverHelper.waitTillPresentAndDisplayed(
				driver,
				By.css( '.wp-checkout__review-order-step .checkout-step__edit-button' )
			);
			await driverHelper.clickWhenClickable(
				driver,
				By.css( '.wp-checkout__review-order-step .checkout-step__edit-button' )
			);
			const twoYearPlan = await driver.findElement(
				By.css( '.wp-checkout__review-order-step ul > li:nth-child(2) > div' )
			);
			await twoYearPlan.click();
			// TODO: This seems flakey, need to think of a way around this.
			await driver.sleep( 1500 );
			await driverHelper.waitTillPresentAndDisplayed(
				driver,
				By.css( '.wp-checkout__review-order-step .checkout-button.is-status-primary:not(.is-busy)' )
			);
			await driverHelper.clickWhenClickable(
				driver,
				By.css( '.wp-checkout__review-order-step .checkout-button.is-status-primary:not(.is-busy)' )
			);
			const newCartAmount = await securePaymentComponent.cartTotalAmount();
			assert.notStrictEqual(
				originalCartAmount,
				newCartAmount,
				'The cart amounts are the same after changing plans'
			);
		} );
	} );

	describe( 'Can add/remove coupons', async function () {
		step( 'Can Enter Coupon Code', async function () {
			const enterCouponCodeButton = await driverHelper.isElementPresent(
				driver,
				By.css( '.wp-checkout-order-review__show-coupon-field-button' )
			);
			// If the button doesn't exist lets check to see if a coupon has already been applied
			if ( enterCouponCodeButton ) {
				const securePaymentComponent = await SecurePaymentComponent.Expect( driver );
				const originalCartAmount = await securePaymentComponent.cartTotalAmount();
				await securePaymentComponent.enterCouponCode( dataHelper.getTestCouponCode() );
				const newCartAmount = await securePaymentComponent.cartTotalAmount();
				const expectedCartAmount =
					Math.round( ( originalCartAmount * 0.99 + Number.EPSILON ) * 100 ) / 100;
				assert.strictEqual( newCartAmount, expectedCartAmount, 'Coupon not applied properly' );
			} else {
				const existingCoupon = await driverHelper.isElementPresent(
					driver,
					By.css( '.checkout-line-item[data-product-type="coupon"]' )
				);
				assert.strictEqual(
					existingCoupon,
					true,
					'We cannot find the apply coupon button, and an existing coupon code is not applied. Something is wrong'
				);
			}
		} );

		step( 'Can Remove Coupon', async function () {
			await driver.switchTo().defaultContent();
			const securePaymentComponent = await SecurePaymentComponent.Expect( driver );
			const originalCartAmount = await securePaymentComponent.cartTotalAmount();
			await securePaymentComponent.removeCoupon();
			const removedCouponAmount = await securePaymentComponent.cartTotalAmount();
			assert.notStrictEqual(
				removedCouponAmount,
				originalCartAmount,
				'Coupon not removed properly'
			);
		} );

		step( 'Can Save Order And Continue', async function () {
			return await driverHelper.clickWhenClickable(
				driver,
				By.css(
					'.composite-checkout .wp-checkout__review-order-step .checkout-button.is-status-primary'
				)
			);
		} );
	} );

	describe( 'Can make payment', function () {
		const testCreditCardDetails = dataHelper.getTestCreditCardDetails();

		step( 'Can enter/submit test payment details', async function () {
			const existingCardIsPresent = await driverHelper.isElementPresent(
				driver,
				By.css( '[id*="existingCard-"]' )
			);
			const securePaymentComponent = await SecurePaymentComponent.Expect( driver );
			await securePaymentComponent.completeTaxDetailsInContactSection( testCreditCardDetails );
			if ( ! existingCardIsPresent ) {
				await securePaymentComponent.enterTestCreditCardDetails( testCreditCardDetails );
			}
			await securePaymentComponent.submitPaymentDetails();
			await securePaymentComponent.waitForCreditCardPaymentProcessing();
			return await securePaymentComponent.waitForPageToDisappear();
		} );

		step( 'Can decline upgrade offer', async function () {
			const upsellPage = await UpsellPage.Expect( driver );
			return await upsellPage.declineOffer();
		} );

		step( 'Can return to editor', async function () {
			const gEditorComponent = await GutenbergEditorComponent.Expect( driver );
			await gEditorComponent.initEditor();
			await driver.switchTo().defaultContent();
			const destinationUrl = await driver.executeScript( 'return window.location.href' );
			assert.strictEqual(
				editorUrl,
				destinationUrl,
				'Did not return to editor after using editor checkout'
			);
		} );
	} );

	describe( 'Can delete the premium plan', async function () {
		step( 'Can log in', async function () {
			const loginFlow = new LoginFlow( driver, 'gutenbergSimpleSiteFreePlanUser', {
				useSandboxForPayments: true,
			} );
			return await loginFlow.login();
		} );

		step( 'Can delete the premium plan', async function () {
			return await new DeletePlanFlow( driver ).deletePlan( 'premium' );
		} );
	} );
} );