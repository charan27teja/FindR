# FindR

Welcome to FindR, a professional multiple tenant lost and found platform designed to streamline item intake and secure claiming processes.

Deployed in-beta version: https://findr-web-five.vercel.app/

## Project Overview

FindR simplifies the process of managing lost items across various organizations. By leveraging advanced artificial intelligence and vision models, the application allows staff members to photograph found items, automatically filling in descriptive attributes and saving valuable time.

Seekers can search for their lost belongings using plain language descriptions. The platform matches these descriptions against our securely stored database, presenting potential matches while strictly preserving the privacy of sensitive item details. 

To claim an item, seekers must answer automatically generated verification questions based on private attributes of the item. This ensures that only the rightful owners can claim their belongings. Upon successful verification, the platform facilitates a secure in person handover process with an append only audit trail.

## Key Features

* **Rapid Intake**
  Staff can catalog items in under fifteen seconds using automated computer vision.

* **Secure Verification**
  Claimants are challenged with specific questions generated from private item details, ensuring secure verification.

* **Privacy First Architecture**
  Sensitive item details and unredacted images are strictly guarded and never exposed to unverified users.

* **Multiple Tenant Support**
  A single codebase and database efficiently serve multiple distinct organizations, maintaining strict data isolation.

## Getting Started

To run the project locally, please follow the steps below. We appreciate your interest in our platform.

1. Install all required dependencies.
2. Start the database environment locally or point it to a cloud project.
3. Reset the database to apply migrations and seed data.
4. Copy the environment variables template and provide your specific credentials.
5. Start the development server.

## Code Quality and Checks

We maintain high standards for code quality. Please utilize the available testing and linting commands to ensure your contributions meet our project guidelines.

* Run the test suite to verify data privacy constraints and core functionality.
* Run the linter to ensure code style consistency.
* Run type checking to validate code integrity.

Thank you for contributing to FindR. We kindly request that you review the engineering requirements document for comprehensive technical specifications before making any changes.
