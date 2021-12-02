# SSI Onboarding Gaia-X hackathon #2

A quick and easy four-step guide focussing on onboarding to the MVG SSI solution.

In this guide we'll outline how one can

1. setup the walt.id SSIKIT
2. use the SSIKIT to create a decentralized identifier to hold Verifiable Credentials
3. get a Verifiable Credential, issued by an EBSI registered institution (in this case deltaDAO AG)
4. create a Verifiable Presentation of the VC by signing with the created DID (step 2)

## Step 1: Setup walt.id SSIKIT

We'll outline the required steps in this tutorial. If you need further help please refer to the walt.id onboarding guide for more details: https://github.com/walt-id/waltid-oceandao-docs

1. Create a directory for the walt.id SSIKIT
   ```
   mkdir did-service && cd did-service
   ```
2. Pull the SSIKIT container
   ```
   docker pull docker.io/waltid/ssikit
   ```
3. Setup an alias for easy access to the CLI tool
   ```
   alias ssikit="docker container run -itv $(pwd)/data:/app/data waltid/ssikit"
   ```

## Step 2: Create a decentralized identifier to hold Verifiable Credentials (VCs)

After setting up the SSIKIT, head to the created directory and execute the following command:

```
ssikit did create -m key
```

This will create a did:key for you, accessible in the `data/did/created` directory. The output should look similar to the following:

```
DID created: did:key:z6MkfubzrwauC368uAixa8uBMXtvVw6r25GkBMTPPz3ruDuD
DID document (below, JSON):

{
    ...
}
```

You can now sign Verifiable Credentials using the created DID document and the walt.id SSIKIT. More on that in step 4.

## Step 3: Get a Verifiable Credential issued by an external organization (issuer)

To get a credential issued for your organization, head over to https://signatory.gaiax.delta-dao.com/v1/swagger. Here you will use the `walt.id SSIKIT` signatory to issue a credential, which is currently hosted and operated by deltaDAO. Head down to the `/v1/credentials/issue` route and expand the section. Click on `Try it out` to be able to edit the request body. Here you need to provide the following info:
```json
{
  "templateId": "GaiaxCredential",
  "config": {
    "issuerDid": "did:web:gaiax.delta-dao.com",
    "subjectDid": "did:key:z6MkfubzrwauC368uAixa8uBMXtvVw6r25GkBMTPPz3ruDuD"
    "proofType": "LD_PROOF",
    "issueDate": "2021-12-02T12:20:18.831Z",
    "validDate": "2021-12-02T12:20:18.831Z"
  },
  "credentialData": {
    ...
  }
}
```

- For the MVG context we use the `GaiaxCredential` template. You can find an example of how this looks [here](https://raw.githubusercontent.com/deltaDAO/files/main/vc.json).
- The only `issuerDid` currently set up with our signatory is the `did:web:gaiax.delta-dao.com`, so we will use it for MVG demos.
- For the `subjectDid` you can use the did you created in step 2.
- The `proofType` should be set to LD_PRROF, to receivee a valid JSON-LD file.
- You can keep the pre-configured values for `issueDate` and `validDate` or set them to any desired dates.

For the last step we need to provide some Credential Data. For ease of access we set this up via the API call, with the only restriction of being valid data in the `GaiaxCredential`-Template context. However in a production environment there would be more restrictions or even a compley KYC process foregoing this step.

To get you started quickly we provide a template for the `credentialData` field: https://raw.githubusercontent.com/deltaDAO/files/main/template.json

If you are all set up, your request body should look something like this:
```json
{
  "templateId": "GaiaxCredential",
     "config": {
       "issuerDid": "did:web:gaiax.delta-dao.com",
       "subjectDid": "did:key:z6MkfubzrwauC368uAixa8uBMXtvVw6r25GkBMTPPz3ruDuD"
       "proofType": "LD_PROOF",
       "issueDate": "2021-12-02T12:20:18.831Z",
       "validDate": "2021-12-02T12:20:18.831Z"
     },
  "credentialData": {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
     "credentialSubject": {
       "DNSpublicKey": "your public key",
       "brandName": "my Brand",
       
       ...
       
       "trustState": "trusted",
       "webAddress": {
         "url": "https://www.my-brand.com/"
       }
     }
  }
}
```

You can now click on the `Execute` button in the Swagger interface and if everything was set up correctly, you will receive your new issued Verifiable Credential below in the `response body`.

## Step 4: Present your Verifiable Credential

To create a Verifiable Presentation you need to sign the Verifiable Credential using the DID created in step 2. You can then upload the presentation to make it verifiable by any walt.id SSIKIT Auditor.
For example you can register it with a Verifiable Presentation Registry, like the one we provide at [vp-registry.gaiax.delta-dao.com](vp-registry.gaiax.delta-dao.com) through any supported MVG portal e.g. [portal.minimal-gaia-x.eu](portal.minimal-gaia-x.eu).

Once you receive your VC, head back to the waltid SSIKIT directory from step 1 (in this example `did-service`). Now copy your Verifiable Credential JSON-LD file somwhere inside the `data` directory. You can then execute the following command to sign and present the Credential:

```
ssikit vc present --holder-did did:key:z6MkfubzrwauC368uAixa8uBMXtvVw6r25GkBMTPPz3ruDuD data/vc.json
```

Please note that the `--holder-did` parameter should reference the public DID key generated in Step 2. You can replace `data/vc.json` with the correct path to your Verifiable Credential.

Once you executed the command you should receive an output similar to this:

```
Results:

Verifiable presentation generated for holder DID: "did:key:z6MkfubzrwauC368uAixa8uBMXtvVw6r25GkBMTPPz3ruDuD"
Verifiable presentation document (below, JSON):

{
  ...
}

Verifiable presentation was saved to file: "data/vc/presented/vp-1636639107954.json"
```

You will find your Verifiable Presentation at the mentioned location. To register it with a registry please follow our dedicated guide on `TODO`.
